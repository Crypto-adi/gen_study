const firebaseConfig = {
  apiKey: "AIzaSyC2S8qbyRzKbkfsx-fw0vjbVyMLEfo6Eno",
  authDomain: "genstudy-ae285.firebaseapp.com",
  databaseURL: "https://genstudy-ae285-default-rtdb.firebaseio.com",
  projectId: "genstudy-ae285",
  storageBucket: "genstudy-ae285.firebasestorage.app",
  messagingSenderId: "695080889457",
  appId: "1:695080889457:web:68dd7048f3cf1bd5133fd0",
  measurementId: "G-0NHGX2KS3K"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();