import React from 'react';
import { View, Image, FlatList, Dimensions, StyleSheet, Text } from 'react-native';

const { width } = Dimensions.get('window');

function ImovelCarousel({ fotos }) {
  if (!fotos || fotos.length === 0) {
    return (
      <View style={[styles.imageContainer, styles.placeholder]}>
        <Text style={styles.placeholderText}>Sem Fotos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={fotos}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.link_foto }} 
              style={styles.image} 
              resizeMode="cover"
            />
            {item.titulo && <Text style={styles.legend}>{item.titulo}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    marginTop: 10,
  },
  imageContainer: {
    width: width - 20,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#ccc',
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
  },
  legend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    padding: 8,
    textAlign: 'center',
  }
});

export default ImovelCarousel;