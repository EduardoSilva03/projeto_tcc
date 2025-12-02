# Plataforma de Gestão Imobiliária com Inteligência Artificial

> **Trabalho de Conclusão de Curso** | Curso de Engenharia de Software
>
> Uma solução Full-Stack integrada para modernizar a gestão de imóveis, substituindo processos manuais por automação inteligente e mobilidade.

## 📋 Visão Geral do Projeto

Este projeto resolve problemas críticos na gestão de vendas de construtoras, como inconsistência de dados e conflitos de agendamento. A plataforma centraliza o cadastro de imóveis em um painel web administrativo e distribui as informações em tempo real para corretores através de um aplicativo móvel.

**Diferencial Tecnológico:** Integração com **Google Gemini 1.5 Flash** e **Google Places API** para gerar automaticamente análises de vizinhança e descrições comerciais persuasivas para cada imóvel cadastrado.

## 🚀 Principais Funcionalidades

### 🖥️ Painel Administrativo (Web)

* **Gestão Corporativa:** Cadastro e gerenciamento de múltiplas empresas/filiais.
* **Controle de Acesso:** Cadastro de usuários mobile e vinculação específica a empresas.
* **Catálogo de Imóveis:** CRUD completo de imóveis com upload de fotos e documentos.
* **Geração de Conteúdo via I.A.:** Criação automática de descrições de venda baseadas na geolocalização do imóvel.

### 📱 Aplicativo do Corretor (Mobile)

* **Acesso Seguro:** Login único.
* **Multi-Empresa:** Seleção de empresas para corretores que atendem múltiplas filiais.
* **Busca Inteligente:** Filtros avançados por situação, valor e localização.
* **Gestão de Visitas (Tempo Real):** Sistema de Reserva de Visita que impede conflitos de horário entre corretores.
* **Informações Enriquecidas:** Visualização de carrossel de fotos, documentos técnicos e análise de vizinhança gerada por I.A.

## 🛠️ Arquitetura e Tecnologias

O sistema utiliza uma arquitetura **Cliente-Servidor Desacoplada**, garantindo escalabilidade e manutenção independente.

* **Backend:** Node.js com Express (API RESTful).
* **Banco de Dados:** PostgreSQL.
* **Frontend Web:** React.js e CSS3.
* **Mobile:** React Native.
* **Inteligência Artificial:** Engenharia de Prompt utilizando Google Gemini.
* **Qualidade:** Testes Unitários automatizados com Jest.

## ⚙️ Pré-requisitos de Instalação

Certifique-se de ter o ambiente de desenvolvimento configurado:

* [Node.js] (v18 ou superior)
* [PostgreSQL] (Serviço rodando na porta 5432)
* [Android Studio] (Configurado com emulador)
* Chave de API do Google Cloud (com *Generative Language API* e *Places API* ativadas)

## 🚀 Guia de Execução

Para rodar a aplicação completa, você precisará de **4 terminais** abertos simultaneamente. Siga a ordem abaixo rigorosamente.

### Passo 1: Inicialização do Dispositivo

1. Abra o **Android Studio**.
2. Acesse o **Virtual Device Manager**.
3. Inicie seu **Emulador Android**.
4. **Aguarde** o sistema operacional carregar completamente.

### Passo 2: Backend (API)

No primeiro terminal, inicie o servidor.

```bash
cd backend
npm run dev
```
- O servidor iniciará na porta 5000 e conectará ao banco de dados.

### Passo 3: Frontend (Web)

No segundo terminal, inicie o painel administrativo.

```bash
cd frontend
npm start
```
- O navegador abrirá automaticamente em http://localhost:3000.

### Passo 4: Mobile (Metro Bundler)

No terceiro terminal, inicie o empacotador do React Native.

```bash
cd AppMobile
npx react-native start
```
- Mantenha este terminal rodando em segundo plano para servir os arquivos JavaScript ao app.

### Passo 5: Mobile (Instalação)

No quarto terminal, compile e instale o app no emulador.

```bash
cd AppMobile
npx react-native run-android
```
- Aguarde a mensagem BUILD SUCCESSFUL. O aplicativo abrirá automaticamente no emulador.

### ✅ Verificação de Qualidade (Testes)

Para validar as regras de negócio e a integridade da integração com a I.A., execute a suíte de testes automatizados:

```bash
cd backend
npm test
```

### 📺 Demonstração

**Vídeo de Apresentação:** [Assista no YouTube](https://youtu.be/o2igIaX5OFs)

### 📚 Documentação Completa
Para detalhes sobre a arquitetura, regras de negócio e o projeto completo, acesse nossa Wiki: [Wiki do Projeto](https://github.com/EduardoSilva03/projeto_tcc/wiki)
