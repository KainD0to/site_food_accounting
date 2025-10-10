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

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000'
  : 'https://site-food-accounting.onrender.com';

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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            🍎 Система учета питания
          </Typography>
          
          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Тестовые данные:</strong><br/>
              <Button onClick={handleAdminLogin} size="small" disabled={loading}>
                Админ: Тест админ / 1357911Dan
              </Button><br/>
              <Button onClick={handleParentLogin} size="small" disabled={loading}>
                Родитель: Иванов Иван Иванович / 123
              </Button>
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="ФИО"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              disabled={loading}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

// После endpoints входа добавьте:

// Получить всех студентов (для админа)
app.get('/api/students', async (req, res) => {
  console.log('📋 Запрос всех студентов');
  
  // ТЕСТОВЫЕ ДАННЫЕ
  const testStudents = [
    {
      id: 1,
      full_name: "Иванов Илья Иванович",
      student_id: 1,
      balance: 1500,
      parent_name: "Иванов Иван Иванович"
    },
    {
      id: 2, 
      full_name: "Петров Илья Петрович",
      student_id: 2,
      balance: 800,
      parent_name: "Петров Пётр Петрович"
    }
  ];
  
  res.json(testStudents);
});

// Получить студентов родителя
app.get('/api/parent/students', async (req, res) => {
  console.log('👨‍👦 Запрос студентов родителя');
  
  const token = req.headers.authorization;
  
  // ТЕСТОВЫЕ ДАННЫЕ В ЗАВИСИМОСТИ ОТ ТОКЕНА
  if (token && token.includes('parent-token-1')) {
    // Иванов Иван Иванович видит только своего ребенка
    res.json([{
      id: 1,
      full_name: "Иванов Илья Иванович", 
      student_id: 1,
      balance: 1500
    }]);
  } else if (token && token.includes('parent-token-2')) {
    // Петров Пётр Петрович видит только своего ребенка  
    res.json([{
      id: 2,
      full_name: "Петров Илья Петрович",
      student_id: 2, 
      balance: 800
    }]);
  } else {
    res.json([]);
  }
});

// Получить платежи студента
app.get('/api/students/:id/payments', async (req, res) => {
  const studentId = req.params.id;
  console.log(`💰 Запрос платежей студента ${studentId}`);
  
  // ТЕСТОВЫЕ ПЛАТЕЖИ
  const testPayments = [
    {
      id: 1,
      student_id: parseInt(studentId),
      payment_date: "2024-01-15",
      amount: 1000,
      description: "Пополнение счета"
    },
    {
      id: 2,
      student_id: parseInt(studentId), 
      payment_date: "2024-01-20",
      amount: 500,
      description: "Дополнительное пополнение"
    }
  ];
  
  res.json(testPayments);
});

// Добавить платеж
app.post('/api/payments', async (req, res) => {
  console.log('➕ Добавление платежа:', req.body);
  
  // ТЕСТОВЫЙ ОТВЕТ
  const newPayment = {
    id: Date.now(),
    ...req.body,
    created_at: new Date().toISOString()
  };
  
  res.json(newPayment);
});

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
      const response = await fetch('/api/students', {
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
      const response = await fetch(`/api/students/${studentId}/payments`, {
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
      const response = await fetch('/api/payments', {
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
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Панель администратора
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={onLogout}>Выйти</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Управление счетами студентов
        </Typography>

        <TableContainer component={Paper}>
          <Table>
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
                    <Button 
                      onClick={() => fetchPayments(student.id)}
                      sx={{ mr: 1 }}
                    >
                      История
                    </Button>
                    <Button 
                      variant="outlined"
                      onClick={() => {
                        setSelectedStudent(student.id);
                        setPaymentDialogOpen(true);
                      }}
                    >
                      Пополнить
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedStudent && payments.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              История платежей
            </Typography>
            <TableContainer component={Paper}>
              <Table>
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

        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
          <DialogTitle>Пополнение счета</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Сумма"
              type="number"
              fullWidth
              variant="outlined"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
            />
            <TextField
              margin="dense"
              label="Описание"
              fullWidth
              variant="outlined"
              value={paymentData.description}
              onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
            />
            <TextField
              margin="dense"
              label="Дата"
              type="date"
              fullWidth
              variant="outlined"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddPayment}>Пополнить</Button>
          </DialogActions>
        </Dialog>
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
      const response = await fetch('/api/parent/students', {
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
      const response = await fetch(`/api/students/${studentId}/payments`, {
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
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Личный кабинет родителя
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={onLogout}>Выйти</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Мои дети
        </Typography>

        {students.length === 0 ? (
          <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Нет привязанных студентов
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {students.map((student) => (
              <Card key={student.id} sx={{ minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {student.full_name}
                  </Typography>
                  <Typography color="textSecondary">
                    ID студента: {student.student_id}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 2, color: 'primary.main' }}>
                    Баланс: {student.balance} ₽
                  </Typography>
                  <Button 
                    onClick={() => fetchPayments(student.id)}
                    sx={{ mt: 2 }}
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
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              История платежей
            </Typography>
            <TableContainer component={Paper}>
              <Table>
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

  const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://site-food-accounting-backend.onrender.com/api'
  : '/api';

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