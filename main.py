from fastapi import FastAPI, Depends, HTTPException
from database import engine, Base, SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String
from passlib.context import CryptContext
import models
import schemas

app = FastAPI(title="API Rescate de Comida - México")

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)

# =====================================================================
# 1. DEFINICIÓN DE MODELOS LOCALES (Debe ir antes de create_all)
# =====================================================================
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # 'cliente' o 'restaurante'

# =====================================================================
# 2. CREACIÓN DE TABLAS EN LA BASE DE DATOS
# =====================================================================
Base.metadata.create_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

# =====================================================================
# 3. CONFIGURACIÓN DE SEGURIDAD (ENCRIPTACIÓN)
# =====================================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# DEPENDENCIA PARA LA CONEXIÓN A LA BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================================
# 4. RUTAS PRINCIPALES (ENDPOINTS)
# =====================================================================
@app.get("/")
def read_root():
    return {"status": "¡Éxito!", "message": "El backend para México está vivo."}

# Ruta para registrar un restaurante
@app.post("/restaurants/")
def create_restaurant(restaurant: schemas.RestaurantCreate, db: Session = Depends(get_db)):
    db_restaurant = models.Restaurant(**restaurant.model_dump(), user_id=1) 
    db.add(db_restaurant)
    db.commit()
    db.refresh(db_restaurant)
    return db_restaurant

# Ruta para publicar un platillo
@app.post("/restaurants/{restaurant_id}/meals/")
def create_meal(restaurant_id: int, meal: schemas.MealCreate, db: Session = Depends(get_db)):
    db_meal = models.Meal(**meal.model_dump(), restaurant_id=restaurant_id)
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

# Ruta para ver comida disponible
@app.get("/meals/")
def get_available_meals(db: Session = Depends(get_db)):
    return db.query(models.Meal).filter(models.Meal.stock > 0).all()

# Reservar platillo
@app.put("/meals/{meal_id}/reserve")
def reserve_meal(meal_id: int, db: Session = Depends(get_db)):
    db_meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    
    if db_meal is None:
        raise HTTPException(status_code=404, detail="Platillo no encontrado")
    if db_meal.stock <= 0:
        raise HTTPException(status_code=400, detail="Este platillo ya está agotado")
    
    db_meal.stock -= 1
    db.commit()
    db.refresh(db_meal)
    return db_meal

# Eliminar platillo
@app.delete("/meals/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    db_meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()   
    
    if db_meal is None:
        raise HTTPException(status_code=404, detail="Platillo no encontrado")
    
    db.delete(db_meal)
    db.commit()
    return {"message": "Platillo eliminado correctamente"}

# =====================================================================
# 5. RUTAS DE AUTENTICACIÓN REAL
# =====================================================================
@app.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Buscamos si el correo ya existe en la tabla recién creada
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado.")
    
    # Encriptamos y guardamos
    hashed_pwd = get_password_hash(user.password)
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_pwd, role=user.role)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "¡Cuenta creada con éxito!", "name": new_user.name, "role": new_user.role}

@app.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="El usuario no existe.")
    
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta.")
    
    return {"message": "¡Bienvenido de vuelta!", "name": db_user.name, "role": db_user.role}


# Ruta para el tablero de administrador
@app.get("/admin/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    users = db.query(User).all()
    # Asumiendo que tienes un modelo Restaurant, si no, lo ajustamos
    restaurants = db.query(models.Restaurant).all() 
    
    return {
        "users": [{"name": u.name, "email": u.email, "role": u.role} for u in users],
        "restaurants": [{"id": r.id, "name": r.name} for r in restaurants]
    }