FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace Spaces requires port 7860.
# For local dev, docker-compose overrides PORT back to 8001.
ENV PORT=7860
EXPOSE 7860

CMD ["python", "main.py"]
