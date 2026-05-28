import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ShoppingBag, Store, User, Bell, ArrowRight, Tag, Clock, PlusCircle } from 'lucide-react-native';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⚠️ PON TU IP LOCAL AQUÍ
  const BASE_URL = " https://fine-walls-walk.loca.lt"; 
  const API_URL = `${BASE_URL}/meals/`;

  // Estados para el formulario del restaurante
  const [form, setForm] = useState({
    title: '', description: '', original_price: '', discount_price: '', stock: '', pickup_time: ''
  });

const fetchMeals = () => {
    setLoading(true);
    fetch(API_URL, {
      headers: {
        "Bypass-Tunnel-Reminder": "true" // 👈 Esta es la llave secreta
      }
    })
      .then((res) => res.json())
      .then((data) => { setMeals(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  const publicarPlatillo = async () => {
    if (!form.title || !form.original_price || !form.discount_price) {
      Alert.alert("Campos vacíos", "Por favor llena los datos principales del platillo.");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/restaurants/1/meals/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "Bypass-Tunnel-Reminder": "true" // 👈 También la ponemos aquí
        },
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
      Alert.alert("Error de red", "Verifica que el servidor de Python y Localtunnel estén corriendo.");
    }
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
      // Usamos el ID 1 simulando que somos "Taquería El Fogón"
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
        fetchMeals(); // Recargar la lista de comida
        setCurrentScreen('Home'); // Mandar al usuario a ver su publicación
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandText}>FreshSave <Text style={styles.mxBadge}>MX</Text></Text>
        <TouchableOpacity style={styles.iconButton}>
          <Bell color="#10B981" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* PANTALLA CLIENTE */}
        {currentScreen === 'Home' && (
          <View>
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>¡Hoy rescatamos 45kg de comida!</Text>
              <Text style={styles.bannerSub}>Revisa los platillos disponibles en Polanco, CDMX.</Text>
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
                    <TouchableOpacity style={styles.orderButton}>
                      <Text style={styles.orderButtonText}>Reservar</Text>
                      <ArrowRight color="#FFF" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* PANTALLA RESTAURANTE */}
        {currentScreen === 'Restaurante' && (
          <View>
            <Text style={styles.sectionTitle}>Publicar Comida Sobrante</Text>
            <View style={styles.formCard}>
              
              <Text style={styles.label}>¿Qué vas a rescatar hoy?</Text>
              <TextInput style={styles.input} placeholder="Ej. 1 Kilo de Carnitas surtidas" value={form.title} onChangeText={(text) => setForm({...form, title: text})} />

              <Text style={styles.label}>Descripción breve</Text>
              <TextInput style={[styles.input, {height: 80}]} multiline placeholder="Ej. Incluye tortillas y salsa. Para consumo hoy mismo." value={form.description} onChangeText={(text) => setForm({...form, description: text})} />

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
      </ScrollView>

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
  
  // Estilos del Formulario
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#1F2937' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  publishButton: { backgroundColor: '#F97316', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 25 },
  publishButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});