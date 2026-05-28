from fastapi import FastAPI, Depends
from database import engine, Base, SessionLocal
from sqlalchemy.orm import Session
import models
import schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Rescate de Comida - México")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"status": "¡Éxito!", "message": "El backend para México está vivo."}

# 1. Ruta para registrar un restaurante
@app.post("/restaurants/")
def create_restaurant(restaurant: schemas.RestaurantCreate, db: Session = Depends(get_db)):
    # Para el MVP, simularemos que el user_id siempre es 1 (el dueño)
    db_restaurant = models.Restaurant(**restaurant.model_dump(), user_id=1) 
    db.add(db_restaurant)
    db.commit()
    db.refresh(db_restaurant)
    return db_restaurant

# 2. Ruta para publicar un platillo (Ej. Tacos, Pan dulce)
@app.post("/restaurants/{restaurant_id}/meals/")
def create_meal(restaurant_id: int, meal: schemas.MealCreate, db: Session = Depends(get_db)):
    db_meal = models.Meal(**meal.model_dump(), restaurant_id=restaurant_id)
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

# 3. Ruta para que la app móvil vea toda la comida disponible
@app.get("/meals/")
def get_available_meals(db: Session = Depends(get_db)):
    # Solo mostramos la comida que tiene stock mayor a 0
    return db.query(models.Meal).filter(models.Meal.stock > 0).all()

# 3. Buscar un platillo específico por su ID y reservarlo (restar 1 al inventario)
@app.put("/meals/{meal_id}/reserve")
def reserve_meal(meal_id: int, db: Session = Depends(get_db)):
    # Buscamos el platillo en la base de datos
    db_meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    
    if db_meal is None:
        raise HTTPException(status_code=404, detail="Platillo no encontrado")
    
    if db_meal.stock <= 0:
        raise HTTPException(status_code=400, detail="Este platillo ya está agotado")
    
    # Restamos 1 al inventario y guardamos el cambio
    db_meal.stock -= 1
    db.commit()
    db.refresh(db_meal)
    
    return db_meal