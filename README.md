# Gerenciador de Pressão Arterial

Um aplicativo web para controlar e registrar a pressão arterial de pacientes, com suporte para compartilhamento de dados entre múltiplos usuários.

## Funcionalidades

- Registro de medições de pressão arterial
- Classificação automática baseada em limites configuráveis
- Gráfico de tendência dos últimos 7 registros
- Histórico completo com conselhos médicos
- Compartilhamento de dados via Firebase (multi-usuário)
- Responsivo para desktop e mobile

## Configuração do Firebase

Para habilitar o compartilhamento de dados, você precisa configurar um projeto no Firebase:

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o Firestore Database
4. Vá para Configurações do Projeto > Configuração do SDK Web
5. Copie as configurações e substitua no `index.html` onde está escrito `YOUR_API_KEY`, etc.

### Regras de Segurança do Firestore (opcional, mas recomendado)

Para permitir leitura/escrita apenas para usuários autenticados, configure as regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /patients/{patientId}/records/{recordId} {
      allow read, write: if true; // Para teste, permite tudo. Mude para auth se quiser segurança
    }
  }
}
```

## Como Usar

1. Abra o `index.html` em um navegador
2. Configure o "ID do Paciente/Família" (ex: "avo-maria") - todos que usarem o mesmo ID compartilharão os dados
3. Ajuste os limites de pressão se necessário
4. Registre novas medições no formato "12/8"
5. Visualize o histórico e gráfico
6. Compartilhe o link do site com a família e médica

## Desenvolvimento Local

Para testar localmente, use um servidor HTTP simples:

```bash
python -m http.server 8000
```

Ou qualquer servidor que sirva arquivos estáticos.

## Tecnologias

- HTML5, CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- Firebase Firestore
- Chart.js
- Lucide Icons