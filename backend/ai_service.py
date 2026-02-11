import json
import re
from gigachat import GigaChat
import os
from dotenv import load_dotenv

load_dotenv()

class GigaService:
    def __init__(self):
        self.giga = GigaChat(
            credentials=os.getenv("GIGACHAT_CREDENTIALS"), 
            verify_ssl_certs=False, 
            scope="GIGACHAT_API_PERS"
        )

    def generate_cards(self, text: str, difficulty: str):
        # Устанавливаем количество вопросов согласно твоим требованиям
        settings = {
            "easy": {"count": "6", "style": "базовые понятия и термины"},
            "medium": {"count": "11", "style": "детали, логические связи и определения"},
            "hard": {"count": "18", "style": "глубокий анализ, сложные нюансы и синтез знаний"}
        }
        conf = settings.get(difficulty, settings["easy"])

        try:
            # Максимально сжатый промпт для экономии места
            prompt = f"""Ты — генератор тестов. Тема: {difficulty}. Нужно ровно {conf['count']} вопросов. 
            Стиль: {conf['style']}.
            Ответ СТРОГО JSON массивом:
            [{{"q":"вопрос","o":["вариант1","вариант2","вариант3","вариант4"],"c":"вариант1"}}]
            Важно: только JSON, без вступлений. В "c" пиши ПОЛНЫЙ ТЕКСТ ответа.
            Текст для анализа: {text[:2500]}"""
            
            res = self.giga.chat(prompt)
            content = res.choices[0].message.content
            
            # Очистка от лишнего (markdown и пробелы)
            content = content.replace("```json", "").replace("```", "").strip()
            
            # Поиск начала массива
            start = content.find("[")
            if start == -1: return None
            content = content[start:]

            # РЕМОНТ JSON: Если текст оборвался на Хардкоре
            if not content.endswith("]"):
                last_brace = content.rfind("}")
                if last_brace != -1:
                    content = content[:last_brace+1] + "]"
            
            end = content.rfind("]") + 1
            json_str = content[:end]
            
            # Финальный парсинг
            data = json.loads(json_str)
            
            # Форматируем для базы данных (переименовываем короткие ключи назад)
            return [
                {
                    "question": item.get("q"),
                    "options": item.get("o"),
                    "correct": item.get("c")
                } for item in data
            ]

        except Exception as e:
            print(f"Ошибка парсинга ({difficulty}): {e}")
            # Если всё же упало, пробуем выдать хотя бы часть (для надежности)
            try:
                # Попытка вытащить хоть что-то регуляркой при катастрофическом сбое
                return [] 
            except:
                return None