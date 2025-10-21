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
// Компонент входа по ID студента
function Login({ onLogin, onError }) {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    full_name: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!studentId.trim()) {
      setLoginError('Введите ID студента');
      return;
    }

    setLoading(true);
    setLoginError('');

    try {
      console.log('🚀 Поиск студента по ID:', studentId);
      
      const response = await fetch(`${API_BASE}/api/student/login/${studentId.trim()}`);
    
      console.log('📨 Ответ получен, статус:', response.status);
    
      const data = await response.json();
      console.log('📊 Данные ответа:', data);
    
      if (!response.ok) {
        throw new Error(data.error || `Ошибка: ${response.status}`);
      }
    
      console.log('✅ Успешный вход!');
      onLogin(data.user, 'student-token-' + data.user.id);
      
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      setLoginError('Студент с таким ID не найден');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async () => {
    if (!adminCredentials.full_name || !adminCredentials.password) {
      onError('Введите логин и пароль');
      return;
    }
  
    setLoading(true);
  
    try {
      console.log('🔑 Попытка входа администратора:', adminCredentials.full_name);
      
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminCredentials)
      });
    
      console.log('📨 Ответ получен, статус:', response.status);
    
      const data = await response.json();
      console.log('📊 Данные ответа:', data);
    
      if (!response.ok) {
        throw new Error(data.error || `Ошибка: ${response.status}`);
      }
    
      console.log('✅ Успешный вход администратора!');
      onLogin(data.user, data.token);
      setAdminLoginOpen(false);
      
    } catch (error) {
      console.error('❌ Ошибка входа администратора:', error);
      onError('Неверные учетные данные администратора');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    // Показываем форму входа для администратора
    setAdminLoginOpen(true);
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
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Введите ID студента для входа
          </Typography>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="ID студента"
              name="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loading}
              placeholder="Например: 1001"
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

          {/* Скрытая кнопка для админа - можно удалить после тестирования */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button 
              size="small" 
              onClick={handleAdminLogin}
              sx={{ fontSize: '12px', color: 'gray' }}
            >
              Вход для администратора
            </Button>
          </Box>
        </Paper>
      </Box>
      <Dialog open={adminLoginOpen} onClose={() => setAdminLoginOpen(false)}>
        <DialogTitle>Вход для администратора</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Логин"
            fullWidth
            variant="outlined"
            value={adminCredentials.full_name}
            onChange={(e) => setAdminCredentials({...adminCredentials, full_name: e.target.value})}
          />
          <TextField
            margin="dense"
            label="Пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={adminCredentials.password}
            onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminLoginOpen(false)}>Отмена</Button>
          <Button onClick={handleAdminSubmit} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </DialogActions>
      </Dialog>
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
    const response = await fetch(`${API_BASE}/api/students/${studentId}/payments`, {
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
    const response = await fetch(`${API_BASE}/api/payments`, {
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

function UserDashboard({ user, onLogout, onNotification }) {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/students/${user.id}/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🍎 Учет питания
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={onLogout}>Выйти</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Card sx={{ maxWidth: 400, mx: 'auto', p: 3, mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom align="center">
              Баланс студента
            </Typography>
            <Typography variant="h4" align="center" color="primary" sx={{ my: 2 }}>
              {user.balance} ₽
            </Typography>
            <Typography variant="body1" align="center">
              {user.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              ID: {user.student_id}
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="h5" gutterBottom>
          История платежей
        </Typography>
        
        {payments.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            Платежей пока нет
          </Typography>
        ) : (
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
        // Все остальные (и студенты, и родители) видят один интерфейс
        <UserDashboard 
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