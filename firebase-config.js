// ============================================================
// CONFIGURAÇÃO DO FIREBASE
// ------------------------------------------------------------
// 1. Vá a https://console.firebase.google.com e crie um projeto
//    gratuito (plano "Spark").
// 2. Dentro do projeto: Build > Authentication > Sign-in method
//    → ative "Email/Senha".
// 3. Build > Firestore Database → criar base de dados
//    (modo produção; as regras ficam em firestore.rules).
// 4. Build > Storage → ativar (para as fotos de comprovativo).
// 5. Definições do projeto (ícone de engrenagem) > As suas apps
//    > Web (</>) → copie o objeto firebaseConfig e cole abaixo.
// ============================================================

export const firebaseConfig = {
  apiKey: "COLE_AQUI_A_SUA_API_KEY",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxx"
};

// E-mail(is) com permissão para aprovar comprovativos no admin.html
export const ADMIN_EMAILS = ["seuemail@exemplo.com"];
