from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Связь: одна колода содержит много карточек
    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    question = Column(Text)
    answer = Column(Text)
    
    # Поля для алгоритма интервальных повторений (SRS)
    next_review = Column(DateTime, default=datetime.datetime.utcnow)
    interval = Column(Integer, default=1)  # Интервал в днях
    reps = Column(Integer, default=0)       # Количество успешных повторений
    ease_factor = Column(Integer, default=2) # Коэффициент сложности

    deck = relationship("Deck", back_populates="cards")