import json
import re
from gigachat import GigaChat
import os
from dotenv import load_dotenv

load_dotenv()

class GigaService:
    def __init__(self):
        self.giga = GigaChat(credentials=os.getenv("GIGACHAT_CREDENTIALS"), verify_ssl_certs=False, scope="GIGACHAT_API_PERS")

    def generate_cards(self, text: str, difficulty: str):
        # Оптимизируем количество, чтобы избежать обрыва текста
        settings = {
            "easy": {"count": "5", "style": "базовые понятия"},
            "medium": {"count": "7", "style": "детали и логику"},
            "hard": {"count": "10", "style": "глубокий анализ"}
        }
        conf = settings.get(difficulty, settings["easy"])

        try:
            # Сжимаем промпт до минимума
            prompt = f"""Составь тест ({difficulty}) по тексту. Нужно {conf['count']} вопросов. 
            Верни ТОЛЬКО JSON массив объектов: [{{"question":"текст","options":["а","б","в","г"],"correct":"правильный_текст"}}]
            Текст: {text[:2500]}"""
            
            res = self.giga.chat(prompt)
            content = res.choices[0].message.content
            
            # Очистка от лишнего мусора
            content = content.replace("```json", "").replace("```", "").strip()
            
            # Если ответ оборвался, пытаемся его "закрыть" вручную
            if not content.endswith("]"):
                last_brace = content.rfind("}")
                if last_brace != -1:
                    content = content[:last_brace+1] + "]"
            
            # Ищем границы массива
            start = content.find("[")
            end = content.rfind("]") + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            
            return None
        except Exception as e:
            print(f"Ошибка парсинга JSON: {e}")
            print(f"Текст от ИИ был: {content[:100]}...") # Печатаем начало для отладки
            return None