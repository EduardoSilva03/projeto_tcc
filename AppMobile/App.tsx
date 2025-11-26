import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import EmpresaSelecaoScreen from './src/screens/EmpresaSelecaoScreen';
import ImovelListaScreen from './src/screens/ImovelListaScreen';
import ImovelDetalhesScreen from './src/screens/ImovelDetalhesScreen';
import LogoutButton from './src/components/LogoutButton';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerRight: () => <LogoutButton />,
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            headerShown: false, 
          }} 
        />

        <Stack.Screen 
          name="EmpresaSelecao" 
          component={EmpresaSelecaoScreen} 
          options={{ title: 'Selecione a Empresa' }} 
        />
        <Stack.Screen 
          name="ImovelLista" 
          component={ImovelListaScreen} 
          options={{ title: 'Imóveis Disponíveis' }} 
        />
        <Stack.Screen 
          name="ImovelDetalhes" 
          component={ImovelDetalhesScreen} 
          options={{ title: 'Detalhes do Imóvel' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;