from fastapi import FastAPI, Depends, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

import models, database, ai_service

# Конфигурация безопасности
SECRET_KEY = "FLASHMIND_SUPER_SECRET_KEY" # В реальном проекте храни в .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 день

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)
giga = ai_service.GigaService()

# --- Вспомогательные функции ---
def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    # Используем теперь timezone.utc, который мы импортировали выше
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError: raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None: raise credentials_exception
    return user

# --- Маршруты Авторизации ---

@app.post("/register")
async def register(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    hashed_pwd = pwd_context.hash(password)
    new_user = models.User(email=email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    return {"message": "User created"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Учебные маршруты ---

@app.get("/decks")
async def get_decks(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Возвращаем только колоды, принадлежащие текущему пользователю
    return db.query(models.Deck).filter(models.Deck.user_id == current_user.id).all()

@app.post("/generate")
async def generate(
    text: str = Form(...), 
    title: str = Form(...), 
    difficulty: str = Form(...), 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    cards_data = giga.generate_cards(text, difficulty)
    if not cards_data:
        raise HTTPException(status_code=500, detail="AI Error")
    
    new_deck = models.Deck(title=title, difficulty=difficulty, user_id=current_user.id)
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    
    for item in cards_data:
        card = models.Card(
            deck_id=new_deck.id, 
            question=item.get('question'), 
            options=item.get('options'), 
            correct=item.get('correct')
        )
        db.add(card)
    db.commit()
    return {"status": "ok"}


@app.get("/decks/{deck_id}/attempts")
async def get_attempts(deck_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.user_id == current_user.id).first()
    if not deck: raise HTTPException(status_code=404)
    return db.query(models.Attempt).filter(models.Attempt.deck_id == deck_id).order_by(models.Attempt.timestamp.desc()).all()


@app.post("/decks/{deck_id}/attempts")
async def save_attempt(deck_id: int, correct: int, wrong: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.user_id == current_user.id).first()
    if not deck: raise HTTPException(status_code=404)
    
    new_attempt = models.Attempt(deck_id=deck_id, correct=correct, wrong=wrong)
    db.add(new_attempt)
    
    # Обновляем общую статистику колоды
    deck.correct_answers += correct
    deck.wrong_answers += wrong
    
    db.commit()
    return {"status": "ok"}
@app.get("/decks/{deck_id}")
async def get_cards(deck_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.user_id == current_user.id).first()
    if not deck: raise HTTPException(status_code=404)
    return db.query(models.Card).filter(models.Card.deck_id == deck_id).all()

@app.post("/cards/{card_id}/review")
async def review_card(card_id: int, known: bool, db: Session = Depends(get_db)):
    card = db.query(models.Card).filter(models.Card.id == card_id).first()
    deck = db.query(models.Deck).filter(models.Deck.id == card.deck_id).first()
    if known:
        deck.correct_answers += 1
    else:
        deck.wrong_answers += 1
    db.commit()
    return {"status": "updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)