from fastapi import FastAPI, Depends, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import database as db
import models  # Импортируем модели
from ai_service import GigaService
import datetime

app = FastAPI()

# Разрешаем CORS для работы с фронтендом
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Создаем таблицы в базе данных при запуске
models.Base.metadata.create_all(bind=db.engine)

giga = GigaService()

def get_db():
    database = db.SessionLocal()
    try:
        yield database
    finally:
        database.close()

@app.post("/generate")
async def generate(text: str = Form(...), title: str = Form(...), difficulty: str = Form("easy"), d: Session = Depends(get_db)):
    cards_data = giga.generate_cards(text, difficulty)
    if not cards_data:
        raise HTTPException(status_code=500, detail="Ошибка генерации ИИ")
    
    # Убедитесь, что здесь передается difficulty
    new_deck = models.Deck(title=title, difficulty=difficulty)
    d.add(new_deck)
    d.commit()
    d.refresh(new_deck)
    
    for item in cards_data:
        card = models.Card(
            deck_id=new_deck.id, 
            question=item.get('question'), # Проверь, что тут question, а не q
            options=item.get('options'), 
            correct=item.get('correct')
        )
        d.add(card)
    d.commit()
    return {"status": "ok"}

@app.post("/cards/{card_id}/review")
async def review_card(card_id: int, known: bool, d: Session = Depends(get_db)):
    card = d.query(models.Card).filter(models.Card.id == card_id).first()
    deck = d.query(models.Deck).filter(models.Deck.id == card.deck_id).first()
    
    if known:
        deck.correct_answers += 1
    else:
        deck.wrong_answers += 1
    d.commit()
    return {"status": "updated"}

@app.get("/decks")
async def get_decks(d: Session = Depends(get_db)):
    # Теперь это сработает, так как в новой базе колонка difficulty появится
    return d.query(models.Deck).all()

@app.get("/decks/{deck_id}")
async def get_cards(deck_id: int, d: Session = Depends(get_db)):
    return d.query(models.Card).filter(models.Card.deck_id == deck_id).all()

@app.post("/cards/{card_id}/review")
async def review_card(card_id: int, known: bool, d: Session = Depends(get_db)):
    card = d.query(models.Card).filter(models.Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")

    if known:
        card.interval *= 2 
        card.reps += 1
    else:
        card.interval = 1 
        card.reps = 0

    card.next_review = datetime.datetime.utcnow() + datetime.timedelta(days=card.interval)
    d.commit()
    return {"status": "success", "next_review": card.next_review}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)