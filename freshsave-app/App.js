import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ShoppingBag, Store, User, Bell, ArrowRight, Tag, Clock, PlusCircle, LogOut, Trash2, Ticket } from 'lucide-react-native';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Welcome');
  const [rolUsuario, setRolUsuario] = useState(null); 
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  const [authMode, setAuthMode] = useState('login'); 
  const [authData, setAuthData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cliente' 
  });

  // --- ESTADOS PARA LAS TABLAS DE ADMIN (ROOT) ---
  const [adminData, setAdminData] = useState({ users: [], restaurants: [] });

  // ⚠️ RECUERDA PONER TU IP DE CASA AQUÍ:
  const BASE_URL = "https://rescuefood-1eol.onrender.com"; 
  const API_URL = `${BASE_URL}/meals/`;

  const [form, setForm] = useState({
    title: '', description: '', original_price: '', discount_price: '', stock: '', pickup_time: ''
  });

  const fetchMeals = () => {
    setLoading(true);
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => { setMeals(data); setLoading(false); })
      .catch((err) => { console.error("Error obteniendo platillos:", err); setLoading(false); });
  };

  const fetchAdminData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/dashboard`);
      const data = await response.json();
      setAdminData(data);
    } catch (error) {
      console.error("Error cargando tablas:", error);
    }
  };

  useEffect(() => {
    if (currentScreen === 'Home' || currentScreen === 'Restaurante') {
      fetchMeals();
    } else if (currentScreen === 'root') {
      fetchAdminData();
    }
  }, [currentScreen]);

  const procesarAuth = async () => {
    if (!authData.email || !authData.password) {
      Alert.alert("Campos vacíos", "El correo y la contraseña son obligatorios.");
      return;
    }
    if (authMode === 'register' && !authData.name) {
      Alert.alert("Campos vacíos", "Por favor ingresa tu nombre o el nombre del negocio.");
      return;
    }

    try {
      const endpoint = authMode === 'register' ? '/register' : '/login';
      const bodyData = authMode === 'register' 
        ? { name: authData.name, email: authData.email, password: authData.password, role: authData.role }
        : { email: authData.email, password: authData.password };

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("¡Éxito!", data.message);
        setAuthData(prev => ({ ...prev, name: data.name })); 
        
        iniciarSesion(data.role, authData.email); 
      } else {
        let mensajeError = "Error de autenticación";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            mensajeError = "Asegúrate de que el formato del correo sea válido (ej. nombre@correo.com)";
          } else {
            mensajeError = data.detail;
          }
        }
        Alert.alert("Error", mensajeError);
      }
    } catch (error) {
      Alert.alert("Error de red", "No se pudo conectar con el servidor de FastAPI.");
    }
  };

  const iniciarSesion = (rol, email) => {
    setRolUsuario(rol);
    
    // Portal secreto
    if (email === "admin@gmail.com") {
      setCurrentScreen('root');
    } 
    // Comportamiento normal
    else if (rol === 'restaurante') {
      setCurrentScreen('Restaurante');
    } else {
      setCurrentScreen('Home');
    }
  };

  const cerrarSesion = () => {
    setRolUsuario(null);
    setCart([]); 
    setCurrentScreen('Welcome');
  };

  const activarNotificaciones = () => {
    Alert.alert("Notificaciones Activadas", "Te avisaremos en tiempo real cuando un restaurante cerca de ti publique comida con descuento. 🔔");
  };

  const publicarPlatillo = async () => {
    if (!form.title || !form.original_price || !form.discount_price) {
      Alert.alert("Campos vacíos", "Por favor llena los datos principales del platillo.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/restaurants/1/meals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          original_price: parseFloat(form.original_price),
          discount_price: parseFloat(form.discount_price),
          stock: parseInt(form.stock),
          pickup_time: form.pickup_time || "Al cierre"
        })
      });

      if (response.ok) {
        Alert.alert("¡Éxito!", "Platillo publicado en rescuefood.");
        setForm({ title: '', description: '', original_price: '', discount_price: '', stock: '', pickup_time: '' });
        fetchMeals(); 
      } else {
        Alert.alert("Error", "El servidor rechazó la conexión.");
      }
    } catch (error) {
      Alert.alert("Error de red", "Verifica que el servidor FastAPI esté corriendo en tu IP.");
    }
  };

  const eliminarPlatillo = (id, title) => {
    Alert.alert(
      "Eliminar Platillo", `¿Seguro que deseas borrar "${title}" del menú?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, eliminar", style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/meals/${id}`, { method: 'DELETE' });
              if (response.ok) { fetchMeals(); } 
              else { Alert.alert("Error", "No se pudo borrar el platillo."); }
            } catch (error) { Alert.alert("Error de red", "Verifica que el servidor FastAPI esté corriendo."); }
          } 
        }
      ]
    );
  };

  const reservarPlatillo = (meal) => {
    Alert.alert(
      "Confirmar Reserva", `¿Deseas apartar "${meal.title}" por $${meal.discount_price} MXN?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "¡Sí, reservar!", onPress: () => procesarReserva(meal) }
      ]
    );
  };

  const procesarReserva = async (meal) => {
    try {
      const response = await fetch(`${BASE_URL}/meals/${meal.id}/reserve`, { method: 'PUT' });
      if (response.ok) {
        const numeroTicket = Math.floor(1000 + Math.random() * 9000);
        const ticketCode = `#RF-${numeroTicket}`;
        const reservaNueva = { ...meal, ticket: ticketCode, idReserva: Date.now() };
        
        setCart(prevCart => [...prevCart, reservaNueva]);
        setMeals(prevMeals => prevMeals.map(m => m.id === meal.id ? { ...m, stock: m.stock - 1 } : m));

        Alert.alert("¡Reserva Exitosa! 🎉", `Tu código es: ${ticketCode}\n\nPuedes revisarlo en tu Perfil (Carrito).`);
      } else {
        Alert.alert("Ups", "Alguien te ganó este platillo o hubo un error.");
        fetchMeals(); 
      }
    } catch (error) {
      Alert.alert("Error de red", "No se pudo conectar con el servidor de rescuefood.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {currentScreen === 'Welcome' && (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeLogoCircle}>
            <ShoppingBag color="#FFF" size={60} />
          </View>
          <Text style={styles.welcomeTitle}>rescuefood</Text>
          <Text style={styles.welcomeSubtitle}>Rescata comida deliciosa, ahorra dinero y ayuda al planeta.</Text>
          
          <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('Auth')}>
            <Text style={styles.startButtonText}>Ingresar a la app</Text>
            <ArrowRight color="#FFF" size={20} />
          </TouchableOpacity>
        </View>
      )}

      {currentScreen === 'Auth' && (
        <View style={styles.authMainContainer}>
          <View style={styles.authCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity style={[styles.authTab, authMode === 'login' && styles.authTabActive]} onPress={() => setAuthMode('login')}>
                <Text style={authMode === 'login' ? styles.authTabTextActive : styles.authTabText}>Iniciar Sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.authTab, authMode === 'register' && styles.authTabActive]} onPress={() => setAuthMode('register')}>
                <Text style={authMode === 'register' ? styles.authTabTextActive : styles.authTabText}>Crear Cuenta</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Selecciona tu perfil:</Text>
              <View style={styles.roleSelectorRow}>
                <TouchableOpacity style={[styles.roleSelectBtn, authData.role === 'cliente' && styles.roleSelectBtnActive]} onPress={() => setAuthData({...authData, role: 'cliente'})}>
                  <User color={authData.role === 'cliente' ? '#FFF' : '#6B7280'} size={20} />
                  <Text style={authData.role === 'cliente' ? styles.roleSelectTextActive : styles.roleSelectText}>Cliente</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.roleSelectBtn, authData.role === 'restaurante' && styles.roleSelectBtnActive]} onPress={() => setAuthData({...authData, role: 'restaurante'})}>
                  <Store color={authData.role === 'restaurante' ? '#FFF' : '#6B7280'} size={20} />
                  <Text style={authData.role === 'restaurante' ? styles.roleSelectTextActive : styles.roleSelectText}>Restaurante</Text>
                </TouchableOpacity>
              </View>

              {authMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{authData.role === 'restaurante' ? 'Nombre del Negocio' : 'Nombre Completo'}</Text>
                  <TextInput style={styles.input} placeholder={authData.role === 'restaurante' ? "Ej. Taquería El Fogón" : "Ej. Juan Pérez"} onChangeText={(t) => setAuthData({...authData, name: t})} />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" placeholder="ejemplo@correo.com" onChangeText={(t) => setAuthData({...authData, email: t})} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput style={styles.input} secureTextEntry placeholder="********" onChangeText={(t) => setAuthData({...authData, password: t})} />
              </View>

              <TouchableOpacity style={styles.authSubmitButton} onPress={procesarAuth}>
                <Text style={styles.authSubmitButtonText}>
                  {authMode === 'login' ? 'Entrar a rescuefood' : 'Registrarme'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('Welcome')}>
                <Text style={styles.backButtonText}>Volver al inicio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {currentScreen !== 'Welcome' && currentScreen !== 'Auth' && (
        <>
          <View style={styles.header}>
            <Text style={styles.brandText}>rescuefood</Text>
            {currentScreen !== 'root' && (
              <TouchableOpacity style={styles.iconButton} onPress={activarNotificaciones}>
                <Bell color="#10B981" size={24} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content}>
            {/* 1. PANTALLA CLIENTE (HOME) */}
            {currentScreen === 'Home' && rolUsuario === 'cliente' && (
              <View>
                <View style={styles.banner}>
                  <Text style={styles.bannerTitle}>¡Hola! Listo para rescatar comida?</Text>
                  <Text style={styles.bannerSub}>Revisa los platillos disponibles cerca de ti.</Text>
                </View>
                <Text style={styles.sectionTitle}>Restaurantes Cercanos</Text>
                {loading ? (
                  <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
                ) : meals.length === 0 ? (
                  <Text style={styles.emptyText}>No hay platillos sobrantes por ahora.</Text>
                ) : (
                  meals.map((meal) => (
                    <View key={meal.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.restaurantHeaderLeft}>
                          <Text style={styles.restaurantTag}>🇲🇽 Taquería El Fogón</Text>
                          <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>📍 A 500m</Text>
                          </View>
                        </View>
                        <View style={styles.discountBadge}>
                          <Tag color="#FFF" size={14} />
                          <Text style={styles.discountText}> -50%</Text>
                        </View>
                      </View>
                      <Text style={styles.mealTitle}>{meal.title}</Text>
                      <Text style={styles.mealDescription}>{meal.description}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Clock color="#F97316" size={16} />
                          <Text style={styles.metaText}> Recogida: {meal.pickup_time}</Text>
                        </View>
                        <Text style={styles.stockText}>Quedan: {meal.stock}</Text>
                      </View>
                      <View style={styles.priceRow}>
                        <View style={styles.prices}>
                          <Text style={styles.originalPrice}>${meal.original_price}</Text>
                          <Text style={styles.discountPrice}>${meal.discount_price} MXN</Text>
                        </View>
                        <TouchableOpacity style={[styles.orderButton, meal.stock <= 0 && {backgroundColor: '#9CA3AF'}]} onPress={() => reservarPlatillo(meal)} disabled={meal.stock <= 0}>
                          <Text style={styles.orderButtonText}>{meal.stock > 0 ? 'Reservar' : 'Agotado'}</Text>
                          {meal.stock > 0 && <ArrowRight color="#FFF" size={16} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 2. PANTALLA RESTAURANTE */}
            {currentScreen === 'Restaurante' && rolUsuario === 'restaurante' && (
              <View>
                <Text style={styles.sectionTitle}>Publicar Comida Sobrante</Text>
                <View style={styles.formCard}>
                  <Text style={styles.label}>¿Qué vas a rescatar hoy?</Text>
                  <TextInput style={styles.input} placeholder="Ej. 1 Kilo de Carnitas" value={form.title} onChangeText={(text) => setForm({...form, title: text})} />
                  <Text style={styles.label}>Descripción breve</Text>
                  <TextInput style={[styles.input, {height: 80}]} multiline placeholder="Ej. Incluye tortillas y salsa." value={form.description} onChangeText={(text) => setForm({...form, description: text})} />
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Original ($)</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="200" value={form.original_price} onChangeText={(text) => setForm({...form, original_price: text})} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Oferta ($)</Text>
                      <TextInput style={[styles.input, {borderColor: '#10B981', borderWidth: 2}]} keyboardType="numeric" placeholder="90" value={form.discount_price} onChangeText={(text) => setForm({...form, discount_price: text})} />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Cantidades</Text>
                      <TextInput style={styles.input} keyboardType="numeric" placeholder="Ej. 3" value={form.stock} onChangeText={(text) => setForm({...form, stock: text})} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Horario de recogida</Text>
                      <TextInput style={styles.input} placeholder="Ej. 20:00 - 22:00" value={form.pickup_time} onChangeText={(text) => setForm({...form, pickup_time: text})} />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.publishButton} onPress={publicarPlatillo}>
                    <PlusCircle color="#FFF" size={20} />
                    <Text style={styles.publishButtonText}>Publicar Platillo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, {marginTop: 30}]}>Mis Platillos Activos</Text>
                {loading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : meals.length === 0 ? (
                  <Text style={styles.emptyText}>No tienes comida publicada actualmente.</Text>
                ) : (
                  meals.map((meal) => (
                    <View key={meal.id} style={styles.adminMealCard}>
                      <View style={{flex: 1}}>
                        <Text style={styles.adminMealTitle}>{meal.title}</Text>
                        <Text style={styles.adminMealStock}>Stock actual: {meal.stock} unidades</Text>
                      </View>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarPlatillo(meal.id, meal.title)}>
                        <Trash2 color="#EF4444" size={22} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 3. PANTALLA ROOT (TABLAS DIRECTAS) */}
            {currentScreen === 'root' && (() => {
              // Filtrado y separación de usuarios (ocultando al admin)
              const clientes = adminData.users ? adminData.users.filter(u => u.role === 'cliente' && u.email !== 'admin@gmail.com') : [];
              const restaurantes = adminData.users ? adminData.users.filter(u => u.role === 'restaurante' && u.email !== 'admin@gmail.com') : [];

              return (
                <View style={{ flex: 1, backgroundColor: '#FFF', padding: 5 }}>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000' }}>Tablas de Sistema</Text>
                    <TouchableOpacity onPress={cerrarSesion} style={{ backgroundColor: '#000', padding: 8, borderRadius: 5 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salir</Text>
                    </TouchableOpacity>
                  </View>

                  {/* TABLA EXCLUSIVA DE CLIENTES */}
                  <Text style={{ fontSize: 16, fontWeight: 'bold', backgroundColor: '#E5E7EB', padding: 5, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}>
                    Tabla: CLIENTES ({clientes.length} registros)
                  </Text>
                  <View style={{ borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#E5E7EB', padding: 8 }}>
                      <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>NOMBRE</Text>
                      <Text style={{ flex: 1.5, fontWeight: 'bold', fontSize: 12 }}>EMAIL</Text>
                    </View>
                    {clientes.map((u, index) => (
                      <View key={index} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB', padding: 8 }}>
                        <Text style={{ flex: 1, fontSize: 12 }}>{u.name}</Text>
                        <Text style={{ flex: 1.5, fontSize: 12 }}>{u.email}</Text>
                      </View>
                    ))}
                  </View>

                  {/* TABLA EXCLUSIVA DE RESTAURANTES */}
                  <Text style={{ fontSize: 16, fontWeight: 'bold', backgroundColor: '#E5E7EB', padding: 5, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}>
                    Tabla: RESTAURANTES ({restaurantes.length} registros)
                  </Text>
                  <View style={{ borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#E5E7EB', padding: 8 }}>
                      <Text style={{ flex: 1, fontWeight: 'bold', fontSize: 12 }}>NOMBRE DEL NEGOCIO</Text>
                      <Text style={{ flex: 1.5, fontWeight: 'bold', fontSize: 12 }}>EMAIL</Text>
                    </View>
                    {restaurantes.map((r, index) => (
                      <View key={index} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E5E7EB', padding: 8 }}>
                        <Text style={{ flex: 1, fontSize: 12 }}>{r.name}</Text>
                        <Text style={{ flex: 1.5, fontSize: 12 }}>{r.email}</Text>
                      </View>
                    ))}
                  </View>

                </View>
              );
            })()}

            {/* 4. PANTALLA PERFIL */}
            {currentScreen === 'Perfil' && (
              <View style={styles.profileContainer}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarCircle}>
                    <User color="#FFF" size={40} />
                  </View>
                  <Text style={styles.profileName}>
                    {rolUsuario === 'restaurante' ? (authData.name || 'Cuenta de Negocio') : (authData.name || 'Mi Perfil')}
                  </Text>
                  <Text style={styles.profileBio}>
                    {rolUsuario === 'restaurante' ? 'Restaurante Asociado' : 'Usuario Rescatista'}
                  </Text>
                </View>

                {rolUsuario === 'cliente' && (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.sectionTitle}>Mis Reservas (Carrito)</Text>
                    {cart.length === 0 ? (
                      <View style={styles.emptyCartContainer}>
                        <ShoppingBag color="#D1D5DB" size={40} />
                        <Text style={styles.emptyText}>Aún no tienes platillos por recoger.</Text>
                      </View>
                    ) : (
                      cart.map((item) => (
                        <View key={item.idReserva} style={styles.cartItem}>
                          <View style={styles.cartItemHeader}>
                            <Text style={styles.cartItemTitle}>{item.title}</Text>
                            <Text style={styles.cartItemPrice}>${item.discount_price} MXN</Text>
                          </View>
                          <View style={styles.cartTicketRow}>
                            <Ticket color="#F97316" size={16} />
                            <Text style={styles.cartTicketText}>Código: {item.ticket}</Text>
                          </View>
                          <Text style={styles.cartPickupText}>Recoger a las: {item.pickup_time}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
                  <LogOut color="#EF4444" size={20} />
                  <Text style={styles.logoutText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* OCULTAR BARRA DE NAVEGACIÓN EN MODO ROOT */}
          {currentScreen !== 'root' && currentScreen !== 'Welcome' && currentScreen !== 'Auth' && (
            <View style={styles.bottomNav}>
              {rolUsuario === 'cliente' && (
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Home')}>
                  <ShoppingBag color={currentScreen === 'Home' ? '#10B981' : '#9CA3AF'} size={24} />
                  <Text style={[styles.navText, currentScreen === 'Home' && styles.navTextActive]}>Explorar</Text>
                </TouchableOpacity>
              )}
              {rolUsuario === 'restaurante' && (
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Restaurante')}>
                  <Store color={currentScreen === 'Restaurante' ? '#10B981' : '#9CA3AF'} size={24} />
                  <Text style={[styles.navText, currentScreen === 'Restaurante' && styles.navTextActive]}>Mi Negocio</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Perfil')}>
                <User color={currentScreen === 'Perfil' ? '#10B981' : '#9CA3AF'} size={24} />
                <Text style={[styles.navText, currentScreen === 'Perfil' && styles.navTextActive]}>Perfil</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 10 },
  brandText: { fontSize: 22, fontWeight: 'bold', color: '#10B981' },
  iconButton: { padding: 8 },
  content: { flex: 1, padding: 15 },
  banner: { backgroundColor: '#10B981', padding: 15, borderRadius: 16, marginBottom: 20 },
  bannerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bannerSub: { color: '#E0F2FE', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  restaurantHeaderLeft: { flexDirection: 'column', alignItems: 'flex-start' },
  restaurantTag: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  distanceBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  distanceText: { color: '#3B82F6', fontSize: 11, fontWeight: 'bold' },
  discountBadge: { backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  discountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  mealTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4, marginTop: 6 },
  mealDescription: { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#C2410C', fontWeight: '500' },
  stockText: { fontSize: 13, color: '#9A3412', fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  prices: { flexDirection: 'column' },
  originalPrice: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
  discountPrice: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  orderButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25 },
  orderButtonText: { color: '#FFF', fontWeight: 'bold', marginRight: 6, fontSize: 14 },
  bottomNav: { height: 65, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  navTextActive: { color: '#10B981', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 15, fontSize: 15, marginBottom: 20 },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  publishButton: { backgroundColor: '#F97316', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 25 },
  publishButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  profileContainer: { paddingBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  avatarCircle: { width: 90, height: 90, backgroundColor: '#10B981', borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  profileBio: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#FEF2F2', borderRadius: 12, marginTop: 30, marginBottom: 40 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  welcomeContainer: { flex: 1, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeLogoCircle: { width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  welcomeTitle: { fontSize: 40, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
  welcomeSubtitle: { fontSize: 18, color: '#E0F2FE', textAlign: 'center', marginBottom: 50, paddingHorizontal: 20, lineHeight: 26 },
  startButton: { backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30 },
  startButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  adminMealCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  adminMealTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  adminMealStock: { fontSize: 13, color: '#6B7280' },
  deleteButton: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8 },
  emptyCartContainer: { alignItems: 'center', marginTop: 20, paddingVertical: 30, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', borderStyle: 'dashed' },
  cartItem: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  cartItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cartItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  cartItemPrice: { fontSize: 16, fontWeight: 'bold', color: '#10B981', marginLeft: 10 },
  cartTicketRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  cartTicketText: { color: '#C2410C', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  cartPickupText: { fontSize: 13, color: '#6B7280' },
  authMainContainer: { flex: 1, backgroundColor: '#10B981', justifyContent: 'center', padding: 20 },
  authCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, maxHeight: '90%' },
  authTabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  authTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  authTabActive: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
  authTabText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  authTabTextActive: { fontSize: 16, color: '#10B981', fontWeight: 'bold' },
  roleSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleSelectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, marginHorizontal: 5, borderWidth: 1, borderColor: 'transparent' },
  roleSelectBtnActive: { backgroundColor: '#10B981', borderColor: '#059669' },
  roleSelectText: { marginLeft: 8, fontWeight: '600', color: '#6B7280' },
  roleSelectTextActive: { marginLeft: 8, fontWeight: 'bold', color: '#FFF' },
  inputGroup: { marginBottom: 15 },
  authSubmitButton: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  authSubmitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 15, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 14, textDecorationLine: 'underline' }
});