import './App.css';
import React, { useState, useEffect } from 'react';
import {
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';

const API_BASE = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000'
  : '';

// Тема Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Компонент входа
function Login({ onLogin, onError }) {
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    userType: 'parent'
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false); // ← ДОБАВЬТЕ ЭТУ СТРОКУ!

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('🚀 Отправка запроса на вход...');
      
      const response = await fetch(`${API_BASE}/api/${formData.userType}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          password: formData.password
        })
      });
    
      console.log('📨 Ответ получен, статус:', response.status);
    
      const data = await response.json();
      console.log('📊 Данные ответа:', data);
    
      if (!response.ok) {
        throw new Error(data.error || `Ошибка: ${response.status}`);
      }
    
      console.log('✅ Успешный вход!');
      onLogin(data.user, data.token);
      
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      onError('Ошибка входа: ' + error.message, 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminLogin = () => {
    setFormData({
      full_name: 'Тест админ',
      password: '1357911Dan',
      userType: 'admin'
    });
  };

  const handleParentLogin = () => {
    setFormData({
      full_name: 'Иванов Иван Иванович',
      password: '123',
      userType: 'parent'
    });
  };

  return (
    <Container component="main" maxWidth="xs" className="login-container">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper className="login-card" elevation={3}>
          <Typography className="login-title" component="h1" variant="h5" gutterBottom>
            🍎 Система учета питания
          </Typography>
          
          <Typography className="login-subtitle" variant="body2" color="text.secondary">
            Войдите в свой аккаунт
          </Typography>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }} className="error-message">
              {loginError}
            </Alert>
          )}

          <Box className="test-accounts">
            <Typography className="test-title" variant="body2">
              <strong>Тестовые данные:</strong>
            </Typography>
            <Button 
              onClick={handleAdminLogin} 
              size="small" 
              disabled={loading}
              className="test-account"
              fullWidth
              sx={{ mb: 1 }}
            >
              Админ: Тест админ / 1357911Dan
            </Button>
            <Button 
              onClick={handleParentLogin} 
              size="small" 
              disabled={loading}
              className="test-account"
              fullWidth
            >
              Родитель: Иванов Иван Иванович / 123
            </Button>
          </Box>

          <Box component="form" onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <Typography className="form-label">ФИО</Typography>
              <TextField
                required
                fullWidth
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                variant="outlined"
              />
            </div>
            
            <div className="form-group">
              <Typography className="form-label">Пароль</Typography>
              <TextField
                required
                fullWidth
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                variant="outlined"
              />
            </div>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

// Панель администратора
function AdminDashboard({ user, onLogout, onNotification }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/students`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки');
    const data = await response.json();
    setStudents(data);
  } catch (error) {
    onNotification('Ошибка загрузки студентов: ' + error.message, 'error');
  }
};

const fetchPayments = async (studentId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/students/${studentId}/payments`, {  // ← ДОБАВЬТЕ API_BASE
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки');
    const data = await response.json();
    setPayments(data);
    setSelectedStudent(studentId);
  } catch (error) {
    onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
  }
};

const handleAddPayment = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/payments`, {  // ← ДОБАВЬТЕ API_BASE
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...paymentData,
        student_id: selectedStudent,
        amount: parseFloat(paymentData.amount)
      })
    });

    if (!response.ok) throw new Error('Ошибка добавления');
    
    onNotification('Платеж успешно добавлен', 'success');
    setPaymentDialogOpen(false);
    setPaymentData({ amount: '', description: '', payment_date: new Date().toISOString().split('T')[0] });
    fetchStudents();
    if (selectedStudent) fetchPayments(selectedStudent);
  } catch (error) {
    onNotification('Ошибка добавления платежа: ' + error.message, 'error');
  }
};

  return (
    <Box className="App">
      <AppBar position="static" className="dashboard-header">
        <Toolbar className="header-content">
          <Typography className="header-title" variant="h6" component="div">
            Панель администратора
          </Typography>
          <div className="user-info">
            <Typography className="user-name" variant="body1">
              {user.full_name}
            </Typography>
            <Button
              onClick={onLogout}
              className="logout-button"
            >
              Выйти
            </Button>
          </div>
        </Toolbar>
      </AppBar>

      <Container className="dashboard-content">
        <Typography className="section-title" variant="h4" gutterBottom>
          Управление счетами студентов
        </Typography>

        <TableContainer component={Paper} className="payments-section">
          <Table className="payments-table">
            <TableHead>
              <TableRow>
                <TableCell>ФИО студента</TableCell>
                <TableCell>ID студента</TableCell>
                <TableCell>Родитель</TableCell>
                <TableCell>Баланс</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.full_name}</TableCell>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell>{student.parent_name || 'Не указан'}</TableCell>
                  <TableCell>{student.balance} ₽</TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Button 
                        onClick={() => fetchPayments(student.id)}
                        className="history-button"
                      >
                        История
                      </Button>
                      <Button 
                        variant="contained"
                        onClick={() => {
                          setSelectedStudent(student.id);
                          setPaymentDialogOpen(true);
                        }}
                        className="topup-button"
                      >
                        Пополнить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Box>
  );
}

// Панель родителя
function ParentDashboard({ user, onLogout, onNotification }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/parent/students`, {  // ← ДОБАВЬТЕ API_BASE
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки');
    const data = await response.json();
    setStudents(data);
  } catch (error) {
    onNotification('Ошибка загрузки данных: ' + error.message, 'error');
  }
};

const fetchPayments = async (studentId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/students/${studentId}/payments`, {  // ← ДОБАВЬТЕ API_BASE
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки');
    const data = await response.json();
    setPayments(data);
    setSelectedStudent(studentId);
  } catch (error) {
    onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
  }
};

  return (
    <Box className="App">
      <AppBar position="static" className="dashboard-header">
        <Toolbar className="header-content">
          <Typography className="header-title" variant="h6" component="div">
            Личный кабинет родителя
          </Typography>
          <div className="user-info">
            <Typography className="user-name" variant="body1">
              {user.full_name}
            </Typography>
            <Button 
              color="inherit" 
              onClick={onLogout}
              className="logout-button"
            >
              Выйти
            </Button>
          </div>
        </Toolbar>
      </AppBar>

      <Container className="dashboard-content">
        <Typography className="section-title" variant="h4" gutterBottom>
          Мои дети
        </Typography>

        {students.length === 0 ? (
          <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Нет привязанных студентов
          </Typography>
        ) : (
          <Box className="students-grid">
            {students.map((student) => (
              <Card key={student.id} className="student-card">
                <CardContent>
                  <Typography className="student-name" variant="h6" gutterBottom>
                    {student.full_name}
                  </Typography>
                  <Typography className="student-id" color="textSecondary">
                    ID студента: {student.student_id}
                  </Typography>
                  <Typography className="student-balance" variant="h5">
                    Баланс: {student.balance} ₽
                  </Typography>
                  <Button 
                    onClick={() => fetchPayments(student.id)}
                    className="history-button"
                    variant="outlined"
                  >
                    Показать историю платежей
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {selectedStudent && payments.length > 0 && (
          <Box className="payments-section">
            <Typography className="payments-title" variant="h5" gutterBottom>
              История платежей
            </Typography>
            <TableContainer component={Paper}>
              <Table className="payments-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Сумма</TableCell>
                    <TableCell>Описание</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>{payment.amount} ₽</TableCell>
                      <TableCell>{payment.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>
    </Box>
  );
}

// Главный компонент
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    showNotification('Вход выполнен успешно', 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showNotification('Выход выполнен', 'info');
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (loading) {
    return (
      <Container component="main" maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <Typography>Загрузка...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {!user ? (
        <Login onLogin={handleLogin} onError={showNotification} />
      ) : user.role === 'admin' ? (
        <AdminDashboard 
          user={user} 
          onLogout={handleLogout} 
          onNotification={showNotification} 
        />
      ) : (
        <ParentDashboard 
          user={user} 
          onLogout={handleLogout} 
          onNotification={showNotification} 
        />
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;