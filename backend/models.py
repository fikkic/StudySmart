from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Deck(Base):
    __tablename__ = "decks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    difficulty = Column(String) # 'easy', 'medium', 'hard'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Статистика колоды
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)

    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    question = Column(Text)
    options = Column(JSON, nullable=True)
    correct = Column(String, nullable=True)
    
    # SRS поля оставляем
    next_review = Column(DateTime, default=datetime.datetime.utcnow)
    interval = Column(Integer, default=1)
    
    deck = relationship("Deck", back_populates="cards")