from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime
from datetime import timezone

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    decks = relationship("Deck", back_populates="owner")

class Deck(Base):
    __tablename__ = "decks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    difficulty = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    
    # Глобальная статистика (сумма всех попыток)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)

    owner = relationship("User", back_populates="decks")
    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")
    # Связь с попытками
    attempts = relationship("Attempt", back_populates="deck", cascade="all, delete-orphan")

class Attempt(Base):
    __tablename__ = "attempts"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    correct = Column(Integer)
    wrong = Column(Integer)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    deck = relationship("Deck", back_populates="attempts")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id"))
    question = Column(Text)
    options = Column(JSON, nullable=True)
    correct = Column(String, nullable=True)
    next_review = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    interval = Column(Integer, default=1)
    deck = relationship("Deck", back_populates="cards")