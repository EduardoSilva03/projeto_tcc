import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, ScrollView
} from 'react-native';
import axios from 'axios';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import ImovelCarousel from '../components/ImovelCarousel';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'http://192.168.100.48:5000';

const ImovelListaScreen = () => {
  const [masterImoveis, setMasterImoveis] = useState([]);
  const [filteredImoveis, setFilteredImoveis] = useState([]);

  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const route = useRoute();

  const { empresaId, empresaNome } = route.params;

  const [searchText, setSearchText] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('todas');
  const [valorMaximo, setValorMaximo] = useState('');

  const [opcoesSituacao, setOpcoesSituacao] = useState([]);

  const fetchImoveis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/mobile/empresas/${empresaId}/imoveis`);
      setMasterImoveis(response.data);
      setFilteredImoveis(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os imóveis.');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: empresaNome });
      fetchImoveis();
    }, [navigation, empresaNome, fetchImoveis])
  );

  useEffect(() => {
    let imoveisFiltrados = [...masterImoveis];

    if (searchText.length > 0) {
      const texto = searchText.toLowerCase();
      imoveisFiltrados = imoveisFiltrados.filter(imovel =>
        imovel.nome_residencial.toLowerCase().includes(texto) ||
        (imovel.bairro && imovel.bairro.toLowerCase().includes(texto))
      );
    }

    if (selectedSituacao !== 'todas') {
      imoveisFiltrados = imoveisFiltrados.filter(
        imovel => imovel.situacao === selectedSituacao
      );
    }

    if (valorMaximo > 0) {
      imoveisFiltrados = imoveisFiltrados.filter(
        imovel => parseFloat(imovel.valor) <= parseFloat(valorMaximo)
      );
    }

    const situacoesUnicas = [...new Set(masterImoveis.map(imovel => imovel.situacao))];
    setOpcoesSituacao(['todas', ...situacoesUnicas]);

    setFilteredImoveis(imoveisFiltrados);

  }, [searchText, selectedSituacao, valorMaximo, masterImoveis]);

  const handleSelectImovel = (imovel) => {
    navigation.navigate('ImovelDetalhes', { imovel: imovel });
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  const renderImovelCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectImovel(item)}
    >
      <ImovelCarousel fotos={item.fotos} />
      <Text style={styles.cardTitle}>{item.nome_residencial} - {item.unidade}</Text>
      <Text style={styles.cardPrice}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
      </Text>

      {item.visitante_atual_id ? (
        <View style={styles.visitaBadge}>
          <Text style={styles.visitaText}>
            Em visita: {item.visitante_nome_completo || 'Usuário...'}
          </Text>
        </View>
      ) : (
        <Text style={styles.cardInfo}>Situação: {item.situacao}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou bairro..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#888"
        />
        <View style={styles.rowFilters}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedSituacao}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedSituacao(itemValue)}
            >
              {opcoesSituacao.map(situacao => (
                <Picker.Item
                  key={situacao}
                  label={situacao === 'todas' ? 'Todas Situações' : situacao}
                  value={situacao}
                />
              ))}
            </Picker>
          </View>
          <TextInput
            style={[styles.searchInput, styles.valorInput]}
            placeholder="Valor Máx (ex: 800000)"
            value={valorMaximo}
            onChangeText={setValorMaximo}
            keyboardType="numeric"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      <FlatList
        data={filteredImoveis}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderImovelCard}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum imóvel encontrado para esta empresa ou filtro.</Text>}
        ListHeaderComponent={
          <Text style={styles.resultsText}>
            {`Mostrando ${filteredImoveis.length} de ${masterImoveis.length} imóveis.`}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  rowFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pickerWrapper: {
    flex: 1,
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  picker: {
    height: 45,
    width: '100%',
  },
  valorInput: {
    flex: 1,
  },
  resultsText: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10 },
  cardPrice: { fontSize: 16, color: 'green', fontWeight: 'bold', marginTop: 5 },
  cardInfo: { fontSize: 14, color: '#555', marginTop: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#555' },
  visitaBadge: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffe58f',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  visitaText: {
    color: '#8a6d3b',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ImovelListaScreen;