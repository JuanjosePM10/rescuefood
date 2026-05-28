import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ShoppingBag, Store, User, Bell, ArrowRight, Tag, Clock, PlusCircle, Settings, LogOut, Award, ChevronRight, Heart } from 'lucide-react-native';

export default function App() {
  // 1. Iniciamos la app en la pantalla de Bienvenida
  const [currentScreen, setCurrentScreen] = useState('Welcome');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

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
      .catch((err) => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchMeals();
  }, []);

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
        Alert.alert("¡Éxito!", "Platillo publicado. Los clientes ya pueden verlo.");
        setForm({ title: '', description: '', original_price: '', discount_price: '', stock: '', pickup_time: '' });
        fetchMeals(); 
        setCurrentScreen('Home'); 
      } else {
        Alert.alert("Error", "El servidor rechazó la conexión.");
      }
    } catch (error) {
      Alert.alert("Error de red", "Verifica la conexión a internet.");
    }
  };

  const reservarPlatillo = (meal) => {
    Alert.alert(
      "Confirmar Reserva",
      `¿Deseas apartar "${meal.title}" por $${meal.discount_price} MXN?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "¡Sí, reservar!", onPress: () => procesarReserva(meal) }
      ]
    );
  };

const procesarReserva = async (meal) => {
    try {
      // Hacemos la petición real a tu nuevo endpoint en la nube
      const response = await fetch(`${BASE_URL}/meals/${meal.id}/reserve`, {
        method: 'PUT',
      });

      if (response.ok) {
        // Si el servidor confirma la resta, actualizamos la pantalla
        const nuevoStock = meal.stock - 1;
        setMeals(meals.map(m => m.id === meal.id ? { ...m, stock: nuevoStock } : m));
        
        const numeroTicket = Math.floor(1000 + Math.random() * 9000);
        Alert.alert(
          "¡Reserva Exitosa! 🎉", 
          `Tu código de recolección es: #RF-${numeroTicket}\n\nMuestra este código en el restaurante hoy en el horario de ${meal.pickup_time}.`
        );
      } else {
        Alert.alert("Ups", "Alguien te ganó este platillo o hubo un error.");
        fetchMeals(); // Recarga la lista para mostrar el inventario real
      }
    } catch (error) {
      Alert.alert("Error de red", "No se pudo conectar con el servidor de rescuefood.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* --- PANTALLA DE BIENVENIDA --- */}
      {currentScreen === 'Welcome' && (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeLogoCircle}>
            <ShoppingBag color="#FFF" size={60} />
          </View>
          <Text style={styles.welcomeTitle}>Rescuefood <Text style={styles.mxBadgeWelcome}>MX</Text></Text>
          <Text style={styles.welcomeSubtitle}>Rescata comida deliciosa, ahorra dinero y ayuda al planeta.</Text>
          
          <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('Home')}>
            <Text style={styles.startButtonText}>Comenzar a Explorar</Text>
            <ArrowRight color="#FFF" size={20} />
          </TouchableOpacity>
        </View>
      )}

      {/* Ocultamos la cabecera y el contenido si estamos en Welcome */}
      {currentScreen !== 'Welcome' && (
        <>
          <View style={styles.header}>
            <Text style={styles.brandText}>Rescuefood <Text style={styles.mxBadge}>MX</Text></Text>
            <TouchableOpacity style={styles.iconButton}>
              <Bell color="#10B981" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* PANTALLA EXPLORAR */}
            {currentScreen === 'Home' && (
              <View>
                <View style={styles.banner}>
                  <Text style={styles.bannerTitle}>¡Hoy rescatamos 45kg de comida!</Text>
                  <Text style={styles.bannerSub}>Revisa los platillos disponibles cerca de ti.</Text>
                </View>
                <Text style={styles.sectionTitle}>Platillos del Día con Descuento</Text>
                {loading ? (
                  <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
                ) : meals.length === 0 ? (
                  <Text style={styles.emptyText}>No hay platillos sobrantes por ahora.</Text>
                ) : (
                  meals.map((meal) => (
                    <View key={meal.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.restaurantTag}>🇲🇽 Taquería El Fogón</Text>
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
                        <TouchableOpacity 
                          style={[styles.orderButton, meal.stock <= 0 && {backgroundColor: '#9CA3AF'}]} 
                          onPress={() => reservarPlatillo(meal)}
                          disabled={meal.stock <= 0}
                        >
                          <Text style={styles.orderButtonText}>{meal.stock > 0 ? 'Reservar' : 'Agotado'}</Text>
                          {meal.stock > 0 && <ArrowRight color="#FFF" size={16} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* PANTALLA MI NEGOCIO */}
            {currentScreen === 'Restaurante' && (
              <View>
                <Text style={styles.sectionTitle}>Publicar Comida Sobrante</Text>
                <View style={styles.formCard}>
                  <Text style={styles.label}>¿Qué vas a rescatar hoy?</Text>
                  <TextInput style={styles.input} placeholder="Ej. 1 Kilo de Carnitas surtidas" value={form.title} onChangeText={(text) => setForm({...form, title: text})} />
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
              </View>
            )}

            {/* PANTALLA PERFIL */}
            {currentScreen === 'Perfil' && (
              <View style={styles.profileContainer}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarCircle}>
                    <User color="#FFF" size={40} />
                  </View>
                  <Text style={styles.profileName}>Juan José</Text>
                  <Text style={styles.profileBio}>El inge</Text>
                  <View style={styles.levelBadge}>
                    <Award color="#F59E0B" size={16} />
                    <Text style={styles.levelText}>Nivel 3: Héroe Local</Text>
                  </View>
                </View>
                <Text style={styles.sectionTitle}>Tu Impacto Ecológico</Text>
                <View style={styles.statsRowProfile}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>12</Text>
                    <Text style={styles.statLabel}>Platillos Salvados</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>$850</Text>
                    <Text style={styles.statLabel}>Pesos Ahorrados</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>5 kg</Text>
                    <Text style={styles.statLabel}>CO2 Evitado</Text>
                  </View>
                </View>
                <View style={styles.menuCard}>
                  <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <User color="#4B5563" size={20} />
                      <Text style={styles.menuText}>Mis Datos Personales</Text>
                    </View>
                    <ChevronRight color="#9CA3AF" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <Heart color="#4B5563" size={20} />
                      <Text style={styles.menuText}>Restaurantes Favoritos</Text>
                    </View>
                    <ChevronRight color="#9CA3AF" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <Settings color="#4B5563" size={20} />
                      <Text style={styles.menuText}>Configuración de la App</Text>
                    </View>
                    <ChevronRight color="#9CA3AF" size={20} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.logoutButton}>
                  <LogOut color="#EF4444" size={20} />
                  <Text style={styles.logoutText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* BARRA DE NAVEGACIÓN INFERIOR */}
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Home')}>
              <ShoppingBag color={currentScreen === 'Home' ? '#10B981' : '#9CA3AF'} size={24} />
              <Text style={[styles.navText, currentScreen === 'Home' && styles.navTextActive]}>Explorar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Restaurante')}>
              <Store color={currentScreen === 'Restaurante' ? '#10B981' : '#9CA3AF'} size={24} />
              <Text style={[styles.navText, currentScreen === 'Restaurante' && styles.navTextActive]}>Mi Negocio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Perfil')}>
              <User color={currentScreen === 'Perfil' ? '#10B981' : '#9CA3AF'} size={24} />
              <Text style={[styles.navText, currentScreen === 'Perfil' && styles.navTextActive]}>Perfil</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 10 },
  brandText: { fontSize: 22, fontWeight: 'bold', color: '#10B981' },
  mxBadge: { fontSize: 12, backgroundColor: '#F97316', color: '#FFF', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  iconButton: { padding: 8 },
  content: { flex: 1, padding: 15 },
  banner: { backgroundColor: '#10B981', padding: 15, borderRadius: 16, marginBottom: 20 },
  bannerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bannerSub: { color: '#E0F2FE', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  restaurantTag: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  discountBadge: { backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  discountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  mealTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
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
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 30, fontSize: 15 },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  publishButton: { backgroundColor: '#F97316', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 25 },
  publishButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  profileContainer: { paddingBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  avatarCircle: { width: 90, height: 90, backgroundColor: '#10B981', borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  profileBio: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 10 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  levelText: { color: '#D97706', fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
  statsRowProfile: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { backgroundColor: '#FFF', width: '31%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#10B981', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  menuCard: { backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 20 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, color: '#4B5563', marginLeft: 15, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#FEF2F2', borderRadius: 12 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  
  // ESTILOS DE LA PANTALLA DE BIENVENIDA
  welcomeContainer: { flex: 1, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeLogoCircle: { width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  welcomeTitle: { fontSize: 40, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
  mxBadgeWelcome: { fontSize: 20, backgroundColor: '#F97316', paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  welcomeSubtitle: { fontSize: 18, color: '#E0F2FE', textAlign: 'center', marginBottom: 50, paddingHorizontal: 20, lineHeight: 26 },
  startButton: { backgroundColor: '#F97316', flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  startButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginRight: 10 }
});