from app.api import app


if __name__ == "__main__":
    import uvicorn
    from app.config import settings

    uvicorn.run("app.api:app", host="0.0.0.0", port=settings.port, reload=False)
