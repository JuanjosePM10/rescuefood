import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ShoppingBag, Store, User, ArrowRight, Tag, Clock, PlusCircle, LogOut, Trash2, Star, DollarSign, Calendar, ShoppingCart, Receipt } from 'lucide-react-native';


let globalTransactions = [];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Welcome');
  const [rolUsuario, setRolUsuario] = useState(null); 
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [pendingCart, setPendingCart] = useState([]); 
  const [purchasedTickets, setPurchasedTickets] = useState([]); 

  const [authMode, setAuthMode] = useState('login'); 
  const [authData, setAuthData] = useState({ 
    id: null, 
    name: '', 
    email: '', 
    password: '', 
    role: 'cliente' 
  });
  
  const [adminData, setAdminData] = useState({ users: [], restaurants: [] });

  //  CONFIGURACIÓN LOCAL
  const BASE_URL = "https://rescuefood-1eol.onrender.com"; //cambiar según IP local y puerto del backend
  const API_URL = `${BASE_URL}/meals/`;

  const [form, setForm] = useState({ title: '', description: '', stock: '1' });
  const [sizes, setSizes] = useState([{ name: 'General', original: '', discount: '' }]);

  // ==========================================
  //  MOTOR DE EXTRACCIÓN DE IDs SEGURO
  // ==========================================
  const extraerIdSeguro = (obj) => {
    if (!obj) return null;
    if (obj.restaurant_id !== undefined && obj.restaurant_id !== null) return obj.restaurant_id;
    if (obj.id !== undefined && obj.id !== null) return obj.id;
    if (obj.user_id !== undefined && obj.user_id !== null) return obj.user_id;
    if (obj.owner_id !== undefined && obj.owner_id !== null) return obj.owner_id;
    if (obj._id !== undefined && obj._id !== null) return obj._id;
    return null;
  };


  const calcularPorcentajeDescuento = (original, oferta) => {
    const orig = parseFloat(original);
    const ofer = parseFloat(oferta);
    
    if (!orig || orig <= 0 || !ofer || ofer >= orig) {
      return 0;
    }
    
    const ahorro = orig - ofer;
    const porcentaje = (ahorro / orig) * 100;
    return Math.round(porcentaje);
  };


  const fetchMealsData = async () => {
    setLoading(true);
    try {
      let usersMap = {}; 
      let usersList = [];
      try {
        const adminRes = await fetch(`${BASE_URL}/admin/dashboard`);
        if (adminRes.ok) {
          const adminDataFetch = await adminRes.json();
          usersList = Array.isArray(adminDataFetch) ? adminDataFetch : (adminDataFetch.users || []);
          
          usersList.forEach((u, index) => { 
            let uId = extraerIdSeguro(u);
            if (uId === null) uId = index + 1; 
            usersMap[String(uId)] = u.name; 
          });
          
          setAdminData({ 
            users: usersList, 
            restaurants: usersList.filter(u => u.role === 'restaurante') 
          });
        }
      } catch (e) { 
        console.log("Aviso: No se pudo conectar a la interface admin"); 
      }

      const mealsRes = await fetch(API_URL);
      const mealsData = await mealsRes.json();

      const mappedMeals = mealsData.map(m => {
        const rawId = extraerIdSeguro(m);
        const restaurantId = rawId !== null ? String(rawId) : "";
        return {
          ...m,
          _resolved_rest_id: restaurantId,
          restaurant_name: usersMap[restaurantId] || m.restaurant_name || 'Restaurante Local'
        };
      });

      setMeals(mappedMeals);
    } catch (error) {
      console.error("Error de carga:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (['Home', 'Restaurante', 'root', 'Carrito', 'Perfil'].includes(currentScreen)) {
      fetchMealsData();
    }
  }, [currentScreen]);

  // validacvion de credenciales y gestión de sesión
  const procesarAuth = async () => {
    if (!authData.email || !authData.password) {
      return Alert.alert("Campos vacíos", "El correo y la contraseña son obligatorios.");
    }
    if (authMode === 'register' && !authData.name) {
      return Alert.alert("Campos vacíos", "Por favor ingresa tu nombre o el nombre del negocio.");
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
        let usersList = [];
        try {
          const checkRes = await fetch(`${BASE_URL}/admin/dashboard`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            usersList = Array.isArray(checkData) ? checkData : (checkData.users || []);
          }
        } catch(e) {}
        
        const searchEmail = authData.email.toLowerCase().trim();
        const realUser = usersList.find(u => u.email && u.email.toLowerCase().trim() === searchEmail);
        const finalRole = realUser ? realUser.role : (data.role || authData.role);
        
        let finalId = extraerIdSeguro(realUser) || extraerIdSeguro(data);

        if (finalId === null || finalId === undefined) {
          const userIndex = usersList.findIndex(u => u.email && u.email.toLowerCase().trim() === searchEmail);
          finalId = userIndex !== -1 ? userIndex + 1 : usersList.length + 1;
        }

        const finalName = realUser ? realUser.name : (data.name || authData.name);

        if (authMode === 'login' && authData.email !== "admin@gmail.com") {
          if (finalRole && finalRole !== authData.role) {
            return Alert.alert(
              "Perfil Incorrecto", 
              `Estás intentando entrar como ${authData.role.toUpperCase()},\npero tus credenciales pertenecen a la cuenta de un ${finalRole.toUpperCase()}.`
            );
          }
        }

        setAuthData({ ...authData, id: finalId, name: finalName, role: finalRole }); 
        setRolUsuario(authData.email === "admin@gmail.com" ? 'admin' : finalRole);
        
        if (authData.email === "admin@gmail.com") setCurrentScreen('root');
        else if (finalRole === 'restaurante') setCurrentScreen('Restaurante');
        else setCurrentScreen('Home');

      } else { 
        Alert.alert("Error", data.detail || "Error de autenticación"); 
      }
    } catch (error) { 
      Alert.alert("Error de red", "No se pudo conectar con el servidor."); 
    }
  };

  const entrarComoInvitado = () => {
    setRolUsuario('invitado');
    setCurrentScreen('Home');
  };

  const cerrarSesion = () => {
    setRolUsuario(null);
    setPendingCart([]); 
    setPurchasedTickets([]); 
    setAuthData({ id: null, name: '', email: '', password: '', role: 'cliente' }); 
    setCurrentScreen('Welcome');
  };

  //gestion de restaurante y publicación de platillos
  const addSize = () => setSizes([...sizes, { name: '', original: '', discount: '' }]);
  const updateSize = (index, field, value) => {
    const newSizes = [...sizes];
    newSizes[index][field] = value;
    setSizes(newSizes);
  };
  const removeSize = (index) => setSizes(sizes.filter((_, i) => i !== index));

  const publicarPlatillos = async () => {
    if (!form.title || sizes.some(s => !s.original || !s.discount)) {
      return Alert.alert("Faltan datos", "Completa el nombre y los precios de todos los tamaños.");
    }
    
    const currentRestId = authData.id; 
    if (currentRestId === null || currentRestId === undefined) {
      return Alert.alert("Error de sesión", "El sistema no detectó tu ID. Cierra sesión e ingresa nuevamente.");
    }

    try {
      for (let s of sizes) {
        const titleSuffix = sizes.length > 1 && s.name ? ` (${s.name})` : '';
        await fetch(`${BASE_URL}/restaurants/${currentRestId}/meals/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${form.title}${titleSuffix}`,
            description: form.description || 'Sin descripción',
            original_price: parseFloat(s.original),
            discount_price: parseFloat(s.discount),
            stock: parseInt(form.stock || 1),
            pickup_time: "Disponible hoy" 
          })
        });
      }

      Alert.alert("¡Éxito!", "Los platillos fueron publicados en tu menú.");
      setForm({ title: '', description: '', stock: '1' });
      setSizes([{ name: 'General', original: '', discount: '' }]);
      fetchMealsData(); 
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema de conexión.");
    }
  };

  const eliminarPlatillo = async (id, title) => {
    try {
      const response = await fetch(`${BASE_URL}/meals/${id}`, { method: 'DELETE' });
      if (response.ok) fetchMealsData();
    } catch (error) { 
      Alert.alert("Error", "No se pudo borrar."); 
    }
  };

  // carrito de compras 
  const agregarAlCarrito = (meal) => {
    const enCarrito = pendingCart.filter(item => item.id === meal.id).length;
    if (enCarrito >= meal.stock) {
      return Alert.alert("Stock agotado", "No puedes agregar más unidades de este producto.");
    }
    setPendingCart([...pendingCart, meal]);
    Alert.alert("Añadido", `"${meal.title}" agregado al carrito.`);
  };

  const quitarDelCarrito = (index) => {
    const nuevoCarrito = [...pendingCart];
    nuevoCarrito.splice(index, 1);
    setPendingCart(nuevoCarrito);
  };

  const getGroupedCart = () => {
    return pendingCart.reduce((acc, meal) => {
      const rest = meal.restaurant_name;
      if (!acc[rest]) acc[rest] = [];
      acc[rest].push(meal);
      return acc;
    }, {});
  };

  const confirmarMetodoPagoCarrito = () => {
    if (pendingCart.length === 0) return;
    const granTotal = pendingCart.reduce((sum, item) => sum + item.discount_price, 0);
    Alert.alert(
      "Confirmar Compra",
      `Total a pagar: $${granTotal} MXN\n\n¿Qué método de pago utilizarás en sucursal?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Efectivo", onPress: () => procesarCheckout('Efectivo') },
        { text: "Tarjeta", onPress: () => procesarCheckout('Tarjeta') }
      ]
    );
  };

  const procesarCheckout = async (metodoPago) => {
    try {
      await Promise.all(pendingCart.map(meal => fetch(`${BASE_URL}/meals/${meal.id}/reserve`, { method: 'PUT' })));
      const grouped = getGroupedCart();
      const nuevosTickets = [];
      const fechaActual = new Date();

      Object.keys(grouped).forEach(restName => {
        const items = grouped[restName];
        const totalRest = items.reduce((sum, i) => sum + i.discount_price, 0);
        const ticketCode = `#RF-${Math.floor(1000 + Math.random() * 9000)}`;
        const nombresPlatillos = items.map(i => i.title).join(', ');

        nuevosTickets.push({ 
          idReserva: ticketCode + Date.now(), 
          ticket: ticketCode, 
          restaurante: restName, 
          items: items, 
          total: totalRest, 
          metodo: metodoPago, 
          fecha: fechaActual.toLocaleDateString() 
        });

        globalTransactions.push({
          id: ticketCode,
          monto: totalRest,
          metodo: metodoPago,
          platillo: nombresPlatillos,
          restaurante: restName, 
          usuario: rolUsuario === 'invitado' ? 'Invitado' : authData.name,
          fecha: fechaActual.toLocaleDateString() + ' ' + fechaActual.toLocaleTimeString()
        });
      });

      setPurchasedTickets(prev => [...prev, ...nuevosTickets]);
      setPendingCart([]); 
      fetchMealsData(); 
      Alert.alert("¡Compra Exitosa!", `Tickets listos. Compruébalos en tu Perfil.`);
      setCurrentScreen('Perfil');
    } catch (error) { 
      Alert.alert("Error", "No se pudo completar el proceso."); 
    }
  };

  const agruparPlatillosIguales = (itemsArray) => {
    const counts = {};
    itemsArray.forEach(x => { counts[x.id] = (counts[x.id] || 0) + 1; });
    const unique = itemsArray.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    return unique.map(u => ({ ...u, cantidad: counts[u.id] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* PANTALLA BIENVENIDA */}
      {currentScreen === 'Welcome' && (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeLogoCircle}>
            <ShoppingBag color="#FFF" size={60} />
          </View>
          <Text style={styles.welcomeTitle}>rescuefood</Text>
          <Text style={styles.welcomeSubtitle}>Rescata comida deliciosa y ayuda al planeta.</Text>
          <TouchableOpacity style={styles.startButton} onPress={() => setCurrentScreen('Auth')}>
            <Text style={styles.startButtonText}>Iniciar Sesión / Registro</Text>
            <ArrowRight color="#FFF" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestButton} onPress={entrarComoInvitado}>
            <Text style={styles.guestButtonText}>Explorar sin cuenta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PANTALLA AUTENTICACIÓN */}
      {currentScreen === 'Auth' && (
        <View style={styles.authMainContainer}>
          <View style={{ alignItems: 'center', marginBottom: 35 }}>
            <Text style={[styles.welcomeTitle, { marginBottom: 0 }]}>rescuefood</Text>
          </View>
          <View style={styles.authCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity style={[styles.authTab, authMode === 'login' && styles.authTabActive]} onPress={() => setAuthMode('login')}><Text style={authMode === 'login' ? styles.authTabTextActive : styles.authTabText}>Iniciar Sesión</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.authTab, authMode === 'register' && styles.authTabActive]} onPress={() => setAuthMode('register')}><Text style={authMode === 'register' ? styles.authTabTextActive : styles.authTabText}>Crear Cuenta</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Selecciona tu perfil:</Text>
              <View style={styles.roleSelectorRow}>
                <TouchableOpacity style={[styles.roleSelectBtn, authData.role === 'cliente' && styles.roleSelectBtnActive]} onPress={() => setAuthData({...authData, role: 'cliente'})}><User color={authData.role === 'cliente' ? '#FFF' : '#6B7280'} size={20} /><Text style={authData.role === 'cliente' ? styles.roleSelectTextActive : styles.roleSelectText}>Cliente</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roleSelectBtn, authData.role === 'restaurante' && styles.roleSelectBtnActive]} onPress={() => setAuthData({...authData, role: 'restaurante'})}><Store color={authData.role === 'restaurante' ? '#FFF' : '#6B7280'} size={20} /><Text style={authData.role === 'restaurante' ? styles.roleSelectTextActive : styles.roleSelectText}>Restaurante</Text></TouchableOpacity>
              </View>
              {authMode === 'register' && (<View style={styles.inputGroup}><Text style={styles.label}>{authData.role === 'restaurante' ? 'Nombre del Negocio' : 'Nombre Completo'}</Text><TextInput style={styles.input} onChangeText={(t) => setAuthData({...authData, name: t})} /></View>)}
              <View style={styles.inputGroup}><Text style={styles.label}>Correo Electrónico</Text><TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" onChangeText={(t) => setAuthData({...authData, email: t})} /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>Contraseña</Text><TextInput style={styles.input} secureTextEntry onChangeText={(t) => setAuthData({...authData, password: t})} /></View>
              <TouchableOpacity style={styles.authSubmitButton} onPress={procesarAuth}><Text style={styles.authSubmitButtonText}>Confirmar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('Welcome')}><Text style={styles.backButtonText}>Volver al inicio</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* RENDER PRINCIPAL DE PANTALLAS */}
      {currentScreen !== 'Welcome' && currentScreen !== 'Auth' && (
        <>
          <View style={styles.header}>
            <Text style={styles.brandLogo}>rescuefood</Text>
          </View>

          <ScrollView style={styles.content}>
            
            {/* VISTA EXPLORAR (HOME) */}
            {currentScreen === 'Home' && (rolUsuario === 'cliente' || rolUsuario === 'invitado') && (
              <View>
                {rolUsuario === 'cliente' && (
                  <View style={styles.pointsBanner}>
                    <Star color="#F59E0B" size={20} />
                    <Text style={styles.pointsBannerText}>¡Tienes 120 RescuePoints acumulados!</Text>
                  </View>
                )}
                {rolUsuario === 'invitado' && (
                  <TouchableOpacity style={styles.guestBannerAlert} onPress={() => setCurrentScreen('Auth')}>
                    <Text style={styles.guestBannerTextAlert}>Modo Invitado. Inicia sesión para guardar tickets.</Text>
                    <ArrowRight color="#B45309" size={16} />
                  </TouchableOpacity>
                )}

                <Text style={styles.sectionTitle}>Comida Cerca de Ti</Text>
                {loading ? (
                  <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
                ) : meals.length === 0 ? (
                  <Text style={styles.emptyText}>No hay comida sobrante por ahora.</Text>
                ) : (
                  meals.map((meal) => {
                    const enCarrito = pendingCart.filter(item => item.id === meal.id).length;
                    const stockDisponible = meal.stock - enCarrito;
                    
                    // APLICACIÓN DE LA NUEVA FUNCIÓN EN LA PUBLICACIÓN DEL PÚBLICO
                    const pctDesc = calcularPorcentajeDescuento(meal.original_price, meal.discount_price);

                    return (
                      <View key={meal.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.restaurantTag}>📍 {meal.restaurant_name}</Text>
                          <View style={styles.discountBadge}>
                            <Tag color="#FFF" size={14} />
                            <Text style={styles.discountText}>
                              {pctDesc > 0 ? ` -${pctDesc}% OFF` : ' Oferta'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.mealTitle}>{meal.title}</Text>
                        <Text style={styles.mealDescription}>{meal.description}</Text>
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Clock color="#F97316" size={16} />
                            <Text style={styles.metaText}> {meal.pickup_time}</Text>
                          </View>
                          <Text style={styles.stockText}>Disp: {stockDisponible}</Text>
                        </View>
                        <View style={styles.priceRow}>
                          <View style={styles.prices}>
                            <Text style={styles.originalPrice}>${meal.original_price}</Text>
                            <Text style={styles.discountPrice}>${meal.discount_price} MXN</Text>
                          </View>
                          <TouchableOpacity 
                            style={[styles.orderButton, stockDisponible <= 0 && {backgroundColor: '#9CA3AF'}]} 
                            onPress={() => agregarAlCarrito(meal)} 
                            disabled={stockDisponible <= 0}
                          >
                            <ShoppingCart color="#FFF" size={18} style={{marginRight: 5}}/>
                            <Text style={styles.orderButtonText}>
                              {stockDisponible > 0 ? 'Agregar' : 'Agotado'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* VISTA CARRITO MULTI-LOCAL */}
            {currentScreen === 'Carrito' && (
              <View style={{paddingBottom: 40}}>
                <Text style={[styles.sectionTitle, {fontSize: 22}]}>Tu Carrito</Text>
                {pendingCart.length === 0 ? (
                  <View style={{alignItems: 'center', marginTop: 50}}>
                    <ShoppingCart color="#D1D5DB" size={80} />
                    <Text style={{color: '#9CA3AF', marginTop: 15, fontSize: 16}}>Aún no has agregado nada.</Text>
                    <TouchableOpacity style={[styles.orderButton, {marginTop: 20}]} onPress={() => setCurrentScreen('Home')}><Text style={{color: '#FFF', fontWeight: 'bold'}}>Explorar platillos</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {Object.keys(getGroupedCart()).map((restName, idx) => {
                      const items = getGroupedCart()[restName];
                      const totalRest = items.reduce((sum, i) => sum + i.discount_price, 0);
                      const itemsAgrupados = agruparPlatillosIguales(items);

                      return (
                        <View key={idx} style={styles.cartGroupCard}>
                          <View style={styles.cartGroupHeader}>
                            <Store color="#1F2937" size={18} />
                            <Text style={styles.cartGroupTitle}>{restName}</Text>
                          </View>
                          {itemsAgrupados.map((item, i) => (
                            <View key={i} style={styles.cartGroupItemRow}>
                              <Text style={{fontWeight: 'bold', width: 25}}>{item.cantidad}x</Text>
                              <Text style={{flex: 1, color: '#4B5563'}}>{item.title}</Text>
                              <Text style={{fontWeight: 'bold', color: '#10B981', marginRight: 10}}>${item.discount_price * item.cantidad}</Text>
                              <TouchableOpacity onPress={() => quitarDelCarrito(pendingCart.findIndex(p => p.id === item.id))}><Trash2 color="#EF4444" size={18} /></TouchableOpacity>
                            </View>
                          ))}
                          <View style={styles.cartGroupFooter}>
                            <Text style={styles.cartGroupTotalText}>Subtotal local:</Text>
                            <Text style={styles.cartGroupTotalAmount}>${totalRest} MXN</Text>
                          </View>
                        </View>
                      );
                    })}
                    <View style={styles.checkoutBox}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}><Text style={{fontSize: 18, color: '#4B5563'}}>Total a Pagar:</Text><Text style={{fontSize: 22, fontWeight: 'bold', color: '#1F2937'}}>${pendingCart.reduce((s, i) => s + i.discount_price, 0)} MXN</Text></View>
                      <TouchableOpacity style={styles.checkoutBtn} onPress={confirmarMetodoPagoCarrito}><Receipt color="#FFF" size={20} style={{marginRight: 8}}/><Text style={styles.checkoutBtnText}>Pagar y Generar Tickets</Text></TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* VISTA DEL RESTAURANTE */}
            {currentScreen === 'Restaurante' && rolUsuario === 'restaurante' && (() => {
              let misPlatillos = meals.filter(meal => meal._resolved_rest_id === String(authData.id));
              if (misPlatillos.length === 0) {
                misPlatillos = meals.filter(meal => meal.restaurant_name === authData.name);
              }
              return (
                <View>
                  <Text style={styles.sectionTitle}>Subir Comida</Text>
                  <View style={styles.formCard}>
                    <Text style={styles.label}>Producto</Text><TextInput style={styles.input} value={form.title} onChangeText={(t) => setForm({...form, title: t})} />
                    <Text style={styles.label}>Descripción</Text><TextInput style={styles.input} value={form.description} onChangeText={(t) => setForm({...form, description: t})} />
                    <Text style={styles.label}>Inventario total</Text><TextInput style={styles.input} keyboardType="numeric" value={form.stock} onChangeText={(t) => setForm({...form, stock: t})} />
                    <View style={styles.divider} /><Text style={styles.label}>Tamaños y Precios</Text>
                    {sizes.map((s, index) => (
                      <View key={index} style={styles.sizeRow}>
                        <TextInput style={[styles.input, {flex: 1.5, marginRight: 5}]} placeholder="Ej. Chico" value={s.name} onChangeText={(t) => updateSize(index, 'name', t)} />
                        <TextInput style={[styles.input, {flex: 1, marginRight: 5}]} placeholder="$ Orig." keyboardType="numeric" value={s.original} onChangeText={(t) => updateSize(index, 'original', t)} />
                        <TextInput style={[styles.input, {flex: 1, borderColor: '#10B981', borderWidth: 1}]} placeholder="$ Oferta" keyboardType="numeric" value={s.discount} onChangeText={(t) => updateSize(index, 'discount', t)} />
                        {sizes.length > 1 && (<TouchableOpacity onPress={() => removeSize(index)} style={{padding: 8}}><Trash2 color="#EF4444" size={20}/></TouchableOpacity>)}
                      </View>
                    ))}
                    <TouchableOpacity onPress={addSize} style={{marginTop: 10, alignSelf: 'flex-start'}}><Text style={{color: '#10B981', fontWeight: 'bold'}}>+ Añadir otro tamaño</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.publishButton} onPress={publicarPlatillos}><PlusCircle color="#FFF" size={20} /><Text style={styles.publishButtonText}>Publicar Todo</Text></TouchableOpacity>
                  </View>
                  <Text style={[styles.sectionTitle, {marginTop: 30}]}>Tu Menú Activo</Text>
                  {misPlatillos.length === 0 ? <Text style={styles.emptyText}>No has subido platillos aún.</Text> : 
                    misPlatillos.map((meal) => (
                      <View key={meal.id} style={styles.adminMealCard}>
                        <View style={{flex: 1}}>
                          <Text style={styles.adminMealTitle}>{meal.title}</Text>
                          <Text style={styles.adminMealStock}>Precio: ${meal.discount_price} | Stock: {meal.stock}</Text>
                        </View>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarPlatillo(meal.id, meal.title)}><Trash2 color="#EF4444" size={22} /></TouchableOpacity>
                      </View>
                    ))
                  }
                </View>
              );
            })()}

            {/* TABLA ADMIN ROOT (DASHBOARD COMPLETO) */}
            {currentScreen === 'root' && (() => {
              const clientes = adminData.users ? adminData.users.filter(u => u.role === 'cliente' && u.email !== 'admin@gmail.com') : [];
              const restaurantes = adminData.users ? adminData.users.filter(u => u.role === 'restaurante' && u.email !== 'admin@gmail.com') : [];
              const totalIngresos = globalTransactions.reduce((sum, t) => sum + t.monto, 0);

              return (
                <View style={{ flex: 1, backgroundColor: '#FFF', padding: 5, paddingBottom: 40 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000' }}>Dashboard Admin</Text>
                    <TouchableOpacity onPress={cerrarSesion} style={{ backgroundColor: '#000', padding: 8, borderRadius: 5 }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salir</Text></TouchableOpacity>
                  </View>
                  <View style={{backgroundColor: '#10B981', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3}}>
                    <View><Text style={{color: '#D1FAE5', fontWeight: '600', fontSize: 13, marginBottom: 2}}>INGRESOS TOTALES</Text><Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 24}}>${totalIngresos} MXN</Text></View>
                    <DollarSign color="#FFF" size={32} opacity={0.8}/>
                  </View>
                  
                  <Text style={styles.adminSectionHeader}>HISTORIAL DE VENTAS MULTI-RESTAURANTE</Text>
                  {globalTransactions.length === 0 ? <Text style={{textAlign: 'center', color: '#9CA3AF'}}>No hay transacciones.</Text> : (
                    <View style={{borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8}}>
                      {globalTransactions.slice().reverse().map((t, i) => (
                        <View key={i} style={{padding: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: t.metodo === 'Tarjeta' ? '#EFF6FF' : '#F0FDF4'}}>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontWeight: 'bold', fontSize: 15}}>+ ${t.monto}</Text><Text style={{fontWeight: 'bold', color: t.metodo === 'Tarjeta' ? '#3B82F6' : '#10B981'}}>{t.metodo}</Text></View>
                          <Text style={{fontSize: 13, color: '#4B5563', fontWeight: 'bold', marginTop: 4}}>{t.restaurante} (TKT: {t.id})</Text>
                          <Text style={{fontSize: 13, color: '#6B7280'}}>Items: {t.platillo}</Text>
                          <Text style={{fontSize: 12, color: '#9CA3AF', marginTop: 4}}>Cliente: {t.usuario} | {t.fecha}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.adminSectionHeader}>PLATILLOS ACTIVOS EN PLATAFORMA</Text>
                  <View style={styles.adminTableContainer}>
                    {meals.length === 0 ? <Text style={styles.emptyText}>No hay platillos subidos.</Text> : 
                      meals.map((m, i) => (
                        <View key={i} style={styles.adminHistoryCard}>
                          <View style={styles.adminHistoryRow}>
                            <Text style={styles.adminHistoryName}>{m.title}</Text>
                            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#10B981'}}>${m.discount_price} MXN</Text>
                          </View>
                          <Text style={styles.adminHistoryEmail}>Local: {m.restaurant_name}</Text>
                          <View style={styles.adminHistoryFooter}>
                            <Text style={styles.adminHistoryId}>Stock Disponible: {m.stock}</Text>
                            <Text style={styles.adminHistoryDate}>ID Platillo: {m.id}</Text>
                          </View>
                        </View>
                      ))
                    }
                  </View>

                  <Text style={styles.adminSectionHeader}>HISTORIAL DE RESTAURANTES</Text>
                  <View style={styles.adminTableContainer}>
                    {restaurantes.length === 0 ? <Text style={styles.emptyText}>No hay restaurantes asociados.</Text> : 
                      restaurantes.map((r, i) => (
                        <View key={i} style={styles.adminHistoryCard}>
                          <View style={styles.adminHistoryRow}><Text style={styles.adminHistoryName}>{r.name}</Text><Text style={[styles.badgeActive, {backgroundColor: '#DBEAFE', color: '#1D4ED8'}]}>Verificado</Text></View>
                          <Text style={styles.adminHistoryEmail}>{r.email}</Text>
                          <View style={styles.adminHistoryFooter}>
                            <Text style={styles.adminHistoryId}>ID: RST-{2000 + (extraerIdSeguro(r) || i + 1)}</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}><Calendar size={12} color="#9CA3AF" /><Text style={styles.adminHistoryDate}> Alta: {r.created_at || `1${(i % 9) + 1}/05/2026`}</Text></View>
                          </View>
                        </View>
                      ))
                    }
                  </View>

                  <Text style={styles.adminSectionHeader}>HISTORIAL DE CLIENTES</Text>
                  <View style={styles.adminTableContainer}>
                    {clientes.length === 0 ? <Text style={styles.emptyText}>No hay clientes registrados.</Text> : 
                      clientes.map((u, i) => (
                        <View key={i} style={styles.adminHistoryCard}>
                          <View style={styles.adminHistoryRow}><Text style={styles.adminHistoryName}>{u.name}</Text><Text style={styles.badgeActive}>Cuenta Activa</Text></View>
                          <Text style={styles.adminHistoryEmail}>{u.email}</Text>
                          <View style={styles.adminHistoryFooter}>
                            <Text style={styles.adminHistoryId}>ID: USR-{1000 + (extraerIdSeguro(u) || i + 1)}</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}><Calendar size={12} color="#9CA3AF" /><Text style={styles.adminHistoryDate}> Reg: {u.created_at || `0${(i % 9) + 1}/05/2026`}</Text></View>
                          </View>
                        </View>
                      ))
                    }
                  </View>
                </View>
              );
            })()}

            {/* PANTALLA PERFIL Y TICKETS COMPRADOS */}
            {currentScreen === 'Perfil' && (
              <View style={styles.profileContainer}>
                <View style={styles.profileHeader}>
                  <View style={[styles.avatarCircle, rolUsuario === 'invitado' && {backgroundColor: '#9CA3AF'}]}><User color="#FFF" size={40} /></View>
                  <Text style={styles.profileName}>{rolUsuario === 'invitado' ? 'Invitado' : authData.name}</Text>
                </View>
                {(rolUsuario === 'cliente' || rolUsuario === 'invitado') && (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.sectionTitle}>Mis Códigos de Recogida</Text>
                    {purchasedTickets.length === 0 ? <Text style={styles.emptyText}>No has realizado compras recientes.</Text> : 
                      purchasedTickets.slice().reverse().map((ticketObj) => (
                        <View key={ticketObj.idReserva} style={styles.cartItem}>
                          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontWeight: 'bold', color: '#1F2937', fontSize: 16}}>{ticketObj.restaurante}</Text><Text style={{fontWeight: 'bold', color: '#10B981'}}>${ticketObj.total}</Text></View>
                          <Text style={{color: '#6B7280', fontSize: 13, marginBottom: 8}}>{agruparPlatillosIguales(ticketObj.items).map(i => `${i.cantidad}x ${i.title}`).join(', ')}</Text>
                          <View style={{backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, alignItems: 'center'}}>
                            <Text style={{color: '#B45309', fontSize: 12}}>Muestra este código al llegar:</Text>
                            <Text style={{color: '#9A3412', fontWeight: '900', fontSize: 18, letterSpacing: 2}}>{ticketObj.ticket}</Text>
                          </View>
                        </View>
                      ))
                    }
                  </View>
                )}
                {rolUsuario === 'invitado' ? (
                  <TouchableOpacity style={[styles.orderButton, {marginTop: 30, alignSelf: 'center', paddingHorizontal: 30}]} onPress={() => setCurrentScreen('Auth')}><Text style={{color: '#FFF', fontWeight: 'bold'}}>Crear Cuenta Permanente</Text></TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}><LogOut color="#EF4444" size={20} /><Text style={styles.logoutText}>Cerrar Sesión</Text></TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* BARRA DE NAVEGACIÓN INFERIOR DINÁMICA */}
          {currentScreen !== 'root' && (
            <View style={styles.bottomNav}>
              {(rolUsuario === 'cliente' || rolUsuario === 'invitado') && (
                <>
                  <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Home')}><ShoppingBag color={currentScreen === 'Home' ? '#10B981' : '#9CA3AF'} size={24} /><Text style={[styles.navText, currentScreen === 'Home' && styles.navTextActive]}>Explorar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Carrito')}>
                    <View>
                      <ShoppingCart color={currentScreen === 'Carrito' ? '#10B981' : '#9CA3AF'} size={24} />
                      {pendingCart.length > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{pendingCart.length}</Text></View>}
                    </View>
                    <Text style={[styles.navText, currentScreen === 'Carrito' && styles.navTextActive]}>Carrito</Text>
                  </TouchableOpacity>
                </>
              )}
              {rolUsuario === 'restaurante' && (
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Restaurante')}><Store color={currentScreen === 'Restaurante' ? '#10B981' : '#9CA3AF'} size={24} /><Text style={[styles.navText, currentScreen === 'Restaurante' && styles.navTextActive]}>Menú</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('Perfil')}><User color={currentScreen === 'Perfil' ? '#10B981' : '#9CA3AF'} size={24} /><Text style={[styles.navText, currentScreen === 'Perfil' && styles.navTextActive]}>Perfil</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// paleta de colores y estilos generales para toda la app
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { height: 60, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 10 },
  brandLogo: { fontSize: 26, fontWeight: '900', color: '#10B981', fontStyle: 'italic', letterSpacing: -1 },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  restaurantTag: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  discountBadge: { backgroundColor: '#F97316', flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignItems: 'center' },
  discountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  mealTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  mealDescription: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#FFF7ED', padding: 8, borderRadius: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 13, color: '#C2410C', fontWeight: '500' },
  stockText: { fontSize: 13, color: '#9A3412', fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prices: { flexDirection: 'column' },
  originalPrice: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
  discountPrice: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  orderButton: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
  orderButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  bottomNav: { height: 65, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  navTextActive: { color: '#10B981', fontWeight: 'bold' },
  cartBadge: { position: 'absolute', top: -5, right: -10, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#1F2937' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 15 },
  publishButton: { backgroundColor: '#F97316', flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 25 },
  publishButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  adminMealCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  adminMealTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  adminMealStock: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  deleteButton: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8 },
  welcomeContainer: { flex: 1, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', padding: 20 },
  welcomeLogoCircle: { width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  welcomeTitle: { fontSize: 44, fontWeight: '900', color: '#FFF', fontStyle: 'italic', letterSpacing: -2, marginBottom: 15 },
  welcomeSubtitle: { fontSize: 18, color: '#E0F2FE', textAlign: 'center', marginBottom: 50 },
  startButton: { backgroundColor: '#F97316', flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30, marginBottom: 20 },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  guestButton: { paddingVertical: 15 },
  guestButtonText: { color: '#E0F2FE', fontSize: 16, textDecorationLine: 'underline', fontWeight: '600' },
  authMainContainer: { flex: 1, backgroundColor: '#10B981', justifyContent: 'center', padding: 20 },
  authCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 5 },
  authTabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  authTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  authTabActive: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
  authTabText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  authTabTextActive: { fontSize: 16, color: '#10B981', fontWeight: 'bold' },
  roleSelectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  roleSelectBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 10, marginHorizontal: 5 },
  roleSelectBtnActive: { backgroundColor: '#10B981' },
  roleSelectText: { marginLeft: 8, fontWeight: '600', color: '#6B7280' },
  roleSelectTextActive: { marginLeft: 8, fontWeight: 'bold', color: '#FFF' },
  authSubmitButton: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  authSubmitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 15, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 14, textDecorationLine: 'underline' },
  pointsBanner: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pointsBannerText: { color: '#B45309', fontWeight: 'bold', marginLeft: 10 },
  guestBannerAlert: { backgroundColor: '#FFEDD5', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  guestBannerTextAlert: { color: '#B45309', fontWeight: '600', flex: 1, marginRight: 10 },
  profileContainer: { paddingBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  avatarCircle: { width: 90, height: 90, backgroundColor: '#10B981', borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  cartItem: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#F97316' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#FEF2F2', borderRadius: 12, marginTop: 30 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 15 },
  adminSectionHeader: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 12, marginTop: 25, marginBottom: 10, borderRadius: 6, color: '#4B5563', letterSpacing: 1 },
  adminTableContainer: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  adminHistoryCard: { padding: 15, borderBottomWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#FFF' },
  adminHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  adminHistoryName: { fontWeight: 'bold', fontSize: 15, color: '#1F2937' },
  badgeActive: { backgroundColor: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  adminHistoryEmail: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  adminHistoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 },
  adminHistoryId: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
  adminHistoryDate: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  cartGroupCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#E5E7EB' },
  cartGroupHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10, marginBottom: 10 },
  cartGroupTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginLeft: 8 },
  cartGroupItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cartGroupFooter: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginTop: 5 },
  cartGroupTotalText: { color: '#6B7280', fontWeight: 'bold' },
  cartGroupTotalAmount: { color: '#10B981', fontWeight: 'bold', fontSize: 16 },
  checkoutBox: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 4, marginTop: 10, borderWidth: 1, borderColor: '#10B981' },
  checkoutBtn: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});