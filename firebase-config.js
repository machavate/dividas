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

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyAgcQIWTqPUrzGO7fq6NW1Hx0iWOcC9h7Y",
  authDomain: "dividas-app.firebaseapp.com",
  projectId: "dividas-app",
  storageBucket: "dividas-app.firebasestorage.app",
  messagingSenderId: "474462223199",
  appId: "1:474462223199:web:e2a45cedcea57a27ded4ea",
  measurementId: "G-RYZJ4V1YNW"
};
// E-mail(is) com permissão para aprovar comprovativos no admin.html
export const ADMIN_EMAILS = ["omachavate@gmail.com"];
