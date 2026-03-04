FROM python:3.12-slim
WORKDIR /app
COPY mock_agent.py .
ENTRYPOINT ["python", "mock_agent.py"]