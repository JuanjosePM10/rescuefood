from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite crea un archivo llamado "freshsave.db" en la misma carpeta de tu proyecto. ¡Cero instalaciones extra!
SQLALCHEMY_DATABASE_URL = "sqlite:///./freshsave.db"

# connect_args={"check_same_thread": False} es una configuración específica y necesaria para SQLite en FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()