FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONUTF8=1
ENV PYTHONIOENCODING=utf-8

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py model.pkl ./
COPY dataset ./dataset

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
