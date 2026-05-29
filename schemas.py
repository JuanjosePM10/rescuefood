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

from pydantic import BaseModel, EmailStr

# Molde para cuando el usuario se registra
class UserCreate(BaseModel):
    name: str
    email: EmailStr  # Valida que tenga formato de correo (@)
    password: str
    role: str

# Molde para cuando el usuario inicia sesión
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Molde de respuesta (lo que le regresamos a React Native, SIN la contraseña)
class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        orm_mode = True