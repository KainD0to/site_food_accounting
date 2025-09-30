import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Автоматическое определение API URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);

  // Проверка здоровья сервера
  useEffect(() => {
    checkHealth();
    fetchStudents();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/health`);
      setHealth(response.data);
    } catch (err) {
      setHealth({ status: 'Error', error: err.message });
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/students`);
      setStudents(response.data);
      setError('');
    } catch (err) {
      setError('Ошибка загрузки данных. Проверьте подключение к серверу.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Загрузка...</h2>
          <p>API: {API_BASE}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏫 {process.env.REACT_APP_NAME}</h1>
        <div className="health-status">
          {health && (
            <div className={`health ${health.status === 'OK' ? 'ok' : 'error'}`}>
              Сервер: {health.status} | БД: {health.database}
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {error && <div className="error-message">❌ {error}</div>}

        <section className="section">
          <h2>👥 Ученики ({students.length})</h2>
          <button onClick={fetchStudents} className="refresh-button">
            🔄 Обновить
          </button>
          
          <div className="cards-container">
            {students.map(student => (
              <div key={student.id} className="card">
                <h3>{student.full_name}</h3>
                <p>Класс: {student.class}</p>
                <p>Телефон: {student.phone}</p>
                <small>Создан: {new Date(student.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="debug-info">
          <p><strong>API Endpoint:</strong> {API_BASE}</p>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        </div>
      </main>
    </div>
  );
}

export default App;