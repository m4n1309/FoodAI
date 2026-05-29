import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OBJC_DISABLE_INITIALIZE_FORK_SAFETY"] = "YES"
os.environ["OMP_NUM_THREADS"] = "1"

from app.api import app


if __name__ == "__main__":
    import uvicorn
    from app.config import settings

    uvicorn.run("app.api:app", host="0.0.0.0", port=settings.port, reload=False)
