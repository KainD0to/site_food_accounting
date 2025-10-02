import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL;

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [newStudent, setNewStudent] = useState({ student_code: '', full_name: '', class: '', phone: '' });

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
      setError('Ошибка загрузки данных');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/students`, newStudent);
      setNewStudent({ student_code: '', full_name: '', class: '', phone: '' });
      fetchStudents();
      alert('Ученик успешно создан!');
    } catch (err) {
      setError('Ошибка создания ученика');
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <h2>Загрузка...</h2>
          <p>Подключение к: {API_BASE}</p>
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

        {/* Форма добавления ученика */}
        <section className="section">
          <h2>➕ Добавить ученика</h2>
          <form onSubmit={createStudent} className="student-form">
            <input
              type="text"
              placeholder="Код ученика"
              value={newStudent.student_code}
              onChange={(e) => setNewStudent({...newStudent, student_code: e.target.value})}
              className="form-input"
              required
            />
            <input
              type="text"
              placeholder="ФИО ученика"
              value={newStudent.full_name}
              onChange={(e) => setNewStudent({...newStudent, full_name: e.target.value})}
              className="form-input"
              required
            />
            <input
              type="text"
              placeholder="Класс"
              value={newStudent.class}
              onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
              className="form-input"
              required
            />
            <input
              type="text"
              placeholder="Телефон"
              value={newStudent.phone}
              onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
              className="form-input"
            />
            <button type="submit" className="form-button">
              Создать ученика
            </button>
          </form>
        </section>

        {/* Список учеников */}
        <section className="section">
          <h2>👥 Ученики ({students.length})</h2>
          <button onClick={fetchStudents} className="refresh-button">
            🔄 Обновить
          </button>
          
          <div className="cards-container">
            {students.map(student => (
              <div key={student.id} className="card">
                <h3>{student.full_name}</h3>
                <p><strong>Код:</strong> {student.student_code}</p>
                <p><strong>Класс:</strong> {student.class}</p>
                <p><strong>Телефон:</strong> {student.phone}</p>
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
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('App Name:', process.env.REACT_APP_NAME);

export default App;