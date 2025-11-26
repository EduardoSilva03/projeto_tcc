import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'http://192.168.100.48:5000';

const EmpresaSelecaoScreen = () => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const response = await axios.get(`${API_URL}/mobile/minhas-empresas`);
        setEmpresas(response.data);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar suas empresas.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresas();
  }, []);

  const handleSelectEmpresa = (empresa) => {
    navigation.navigate('ImovelLista', { 
      empresaId: empresa.id, 
      empresaNome: empresa.nome_fantasia || empresa.razao_social 
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={empresas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => handleSelectEmpresa(item)}
          >
            <Text style={styles.cardTitle}>{item.nome_fantasia || item.razao_social}</Text>
            <Text style={styles.cardSubtitle}>{item.cnpj}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Você não está vinculado a nenhuma empresa ativa.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 20, marginVertical: 8, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#777', marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#555' }
});

export default EmpresaSelecaoScreen;