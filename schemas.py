from pydantic import BaseModel

# Esquema para registrar un local
class RestaurantCreate(BaseModel):
    name: str
    address: str
    category: str

# Esquema para publicar la comida sobrante
class MealCreate(BaseModel):
    title: str
    description: str
    original_price: float
    discount_price: float
    stock: int
    pickup_time: str