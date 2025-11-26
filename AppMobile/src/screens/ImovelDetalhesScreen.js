import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ImovelCarousel from '../components/ImovelCarousel';
import axios from 'axios';

const API_URL = 'http://192.168.100.48:5000';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch (e) {
    return 'Data inválida';
  }
};

const ImovelDetalhesScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const [imovel, setImovel] = useState(route.params.imovel);
  const [meuId, setMeuId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `${imovel.nome_residencial} - ${imovel.unidade}` });

    const fetchMeuPerfil = async () => {
      try {
        const response = await axios.get(`${API_URL}/mobile/me`);
        setMeuId(response.data.id);
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível verificar seu perfil.');
      }
    };
    fetchMeuPerfil();
  }, [navigation, imovel.nome_residencial, imovel.unidade]);

  const handleReservarVisita = async () => {
    setLoading(true);
    try {
      const response = await axios.patch(`${API_URL}/mobile/imoveis/${imovel.id}/reservar-visita`);
      const { visitante } = response.data;

      setImovel({
        ...imovel,
        visitante_atual_id: visitante.id,
        visitante_nome_completo: visitante.nome_completo,
      });

    } catch (error) {
      const erroMsg = error.response?.data?.error || 'Não foi possível reservar.';
      Alert.alert('Visita não disponível', erroMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarVisita = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/mobile/imoveis/${imovel.id}/finalizar-visita`);

      setImovel({
        ...imovel,
        visitante_atual_id: null,
        visitante_nome_completo: null,
      });

    } catch (error) {
      const erroMsg = error.response?.data?.error || 'Não foi possível finalizar.';
      Alert.alert('Erro', erroMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = (url) => {
    if (!url) {
      Alert.alert("Erro", "Link de documento não encontrado.");
      return;
    }
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Não é possível abrir este link.");
      }
    });
  };

  const RenderActionButton = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 10 }} />;
    }

    if (imovel.visitante_atual_id === null) {
      return <Button title="Reservar visita" onPress={handleReservarVisita} />;
    }

    if (meuId && imovel.visitante_atual_id === meuId) {
      return <Button title="Finalizar visita" onPress={handleFinalizarVisita} color="red" />;
    }

    return (
      <View style={styles.visitaBadge}>
        <Text style={styles.visitaText}>
          Em visita: {imovel.visitante_nome_completo || 'Usuário...'}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <ImovelCarousel fotos={imovel.fotos} />

      <View style={styles.section}>
        <Text style={styles.title}>{imovel.nome_residencial} - {imovel.unidade}</Text>
        <Text style={styles.price}>{formatCurrency(imovel.valor)}</Text>
      </View>

      {imovel.descricao_ia && (
        <View style={[styles.section, styles.iaContainer]}>
          <Text style={styles.sectionTitle}>Análise da Vizinhança (por I.A.)</Text>
          <Text style={styles.iaText}>{imovel.descricao_ia}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status da Visita</Text>
        <RenderActionButton />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Localização</Text>
        <Text style={styles.infoText}>Endereço: {imovel.rua || 'N/A'}, {imovel.numero || 'N/A'}</Text>
        <Text style={styles.infoText}>Bairro: {imovel.bairro || 'N/A'}</Text>
        <Text style={styles.infoText}>Cidade: {imovel.cidade || 'N/A'} - {imovel.estado || 'N/A'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outras Informações</Text>
        <Text style={styles.infoText}>Entrega Prevista: {formatDate(imovel.data_entrega_prevista)}</Text>
        <Text style={styles.infoText}>Financiamento: {imovel.financiamento_aceito || 'Não informado'}</Text>
        <Text style={styles.infoText}>
          Liberado para Financiamento: {imovel.is_financiamento_liberado ? 'Sim' : 'Não'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documentos e Links</Text>
        {imovel.documentos && imovel.documentos.length > 0 ? (
          imovel.documentos.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docButton}
              onPress={() => handleOpenDocument(doc.link_documento)}
            >
              <Text style={styles.docText}>📄 {doc.titulo}</Text>
              <Text style={styles.docLink}>Acessar</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.infoText}>Nenhum documento disponível.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  price: {
    fontSize: 22,
    color: 'green',
    fontWeight: 'bold',
    marginTop: 10,
  },
  infoText: { fontSize: 16, color: '#555', lineHeight: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#444' },
  visitaBadge: {
    backgroundColor: '#fffbe6',
    borderColor: '#ffe58f',
    borderWidth: 1,
    borderRadius: 4,
    padding: 15,
    marginTop: 8,
  },
  visitaText: {
    color: '#8a6d3b',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  docButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  docText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  docLink: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  iaContainer: {
    backgroundColor: '#f8f9fa',
  },
  iaText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontStyle: 'italic',
  }
});

export default ImovelDetalhesScreen;