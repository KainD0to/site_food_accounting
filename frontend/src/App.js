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
  Alert,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';

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
    student_id: '',
    userType: 'parent'
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFormData({
      full_name: '',
      password: '',
      student_id: '',
      userType: newValue === 0 ? 'parent' : 'admin'
    });
    setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      console.log('🚀 Отправка запроса на вход...');
      
      if (tabValue === 0) {
        // Вход по ID ученика (родитель/ученик)
        if (!formData.student_id.trim()) {
          throw new Error('Введите ID ученика');
        }

        const response = await fetch(`${API_BASE}/api/student/login/${formData.student_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('📨 Ответ получен, статус:', response.status);

        const data = await response.json();
        console.log('📊 Данные ответа:', data);

        if (!response.ok) {
          throw new Error(data.error || `Ошибка: ${response.status}`);
        }

        console.log('✅ Успешный вход по ID ученика!');
        onLogin(data.user, data.token);

      } else {
        // Вход администратора
        if (!formData.full_name || !formData.password) {
          throw new Error('Заполните все поля');
        }

        const response = await fetch(`${API_BASE}/api/admin/login`, {
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

        console.log('✅ Успешный вход администратора!');
        onLogin(data.user, data.token);
      }
      
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      setLoginError(error.message);
      onError('Ошибка входа: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStudentLogin = (studentId) => {
    setFormData({
      full_name: '',
      password: '',
      student_id: studentId,
      userType: 'parent'
    });
  };

  return (
    <Container component="main" maxWidth="sm">
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
          
          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="Родитель/Ученик" />
            <Tab label="Администратор" />
          </Tabs>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {tabValue === 0 ? (
              // Форма для родителя/ученика
              <TextField
                margin="normal"
                required
                fullWidth
                label="ID ученика"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                disabled={loading}
                placeholder="Введите номер ученика"
                helperText="Введите ID ученика для просмотра баланса"
              />
            ) : (
              // Форма для администратора
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="ФИО"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
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
                  autoComplete="current-password"
                />
              </>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? 'Вход...' : tabValue === 0 ? 'Посмотреть баланс' : 'Войти'}
            </Button>
          </Box>

          {tabValue === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              💡 Для входа просто введите ID ученика. Пароль не требуется.
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

// Панель администратора
function AdminDashboard({ user, onLogout, onNotification }) {
  const [students, setStudents] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null); // Для раскрытой строки
  const [payments, setPayments] = useState({}); // Храним платежи по student_id
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    payment_date: new Date().toLocaleDateString('ru-RU') // будет "25.11.2025"
      .split('.')
      .map(part => part.padStart(2, '0')) // добавляем ведущие нули
      .join('-') // получаем "25-11-2025"
  });
  const [loading, setLoading] = useState(false);
  const formatDateForBackend = (dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // в гггг-мм-дд
    }
    return dateStr;
  };
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU'); // дд.мм.гггг
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/students`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      onNotification('Ошибка загрузки учеников: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/students/${studentId}/payments`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      
      // Сохраняем платежи в объект по student_id
      setPayments(prev => ({
        ...prev,
        [studentId]: data
      }));
      
    } catch (error) {
      onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
    }
  };

  const togglePayments = (studentId) => {
    if (expandedStudent === studentId) {
      // Скрываем если уже раскрыто
      setExpandedStudent(null);
    } else {
      // Показываем и загружаем платежи если нужно
      setExpandedStudent(studentId);
      if (!payments[studentId]) {
        fetchPayments(studentId);
      }
    }
  };

  const handleAddPayment = async () => {
    try {
      if (!paymentData.amount || !paymentData.description) {
        throw new Error('Заполните все поля');
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          ...paymentData,
          student_id: expandedStudent,
          amount: parseFloat(paymentData.amount)
        })
      });

      if (!response.ok) throw new Error('Ошибка добавления');
      
      onNotification('Платеж успешно добавлен', 'success');
      setPaymentDialogOpen(false);
      setPaymentData({ amount: '', description: '', payment_date: new Date().toISOString().split('T')[0] });
      
      // Обновляем данные
      fetchStudents();
      if (expandedStudent) {
        fetchPayments(expandedStudent); // Перезагружаем платежи
      }
    } catch (error) {
      onNotification('Ошибка добавления платежа: ' + error.message, 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token
        }
      });

      if (!response.ok) throw new Error('Ошибка удаления');
      
      onNotification('Платеж помечен как удаленный', 'success');
      
      // Обновляем данные
      fetchStudents();
      if (expandedStudent) {
        fetchPayments(expandedStudent);
      }
    } catch (error) {
      onNotification('Ошибка удаления платежа: ' + error.message, 'error');
    }
  };

  const handleRestorePayment = async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/payments/${paymentId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': token
        }
      });

      if (!response.ok) throw new Error('Ошибка восстановления');
      
      onNotification('Платеж восстановлен', 'success');
      
      // Обновляем данные
      fetchStudents();
      if (expandedStudent) {
        fetchPayments(expandedStudent);
      }
    } catch (error) {
      onNotification('Ошибка восстановления платежа: ' + error.message, 'error');
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
          Управление счетами учеников
        </Typography>

        {loading ? (
          <Typography>Загрузка учеников...</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>ФИО ученика</strong></TableCell>
                  <TableCell><strong>ID ученика</strong></TableCell>
                  <TableCell><strong>Баланс</strong></TableCell>
                  <TableCell><strong>Действия</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <React.Fragment key={student.id}>
                    <TableRow hover sx={{ backgroundColor: expandedStudent === student.id ? '#f5f5f5' : 'inherit' }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            sx={{ 
                              transform: expandedStudent === student.id ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s',
                              mr: 1
                            }}
                          >
                            ▶
                          </Typography>
                          {student.full_name}
                        </Box>
                      </TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: student.balance > 0 ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {student.balance} ₽
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button 
                          onClick={() => togglePayments(student.id)}
                          sx={{ mr: 1 }}
                          variant="outlined"
                          size="small"
                        >
                          {expandedStudent === student.id ? 'Скрыть' : 'История'}
                        </Button>
                        <Button 
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setExpandedStudent(student.id);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          Пополнить
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Выпадающая строка с историей платежей */}
                    {expandedStudent === student.id && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 2, backgroundColor: '#fafafa' }}>
                          <Box sx={{ pl: 4 }}>
                            <Typography variant="h6" gutterBottom>
                              История платежей {student.full_name}
                            </Typography>
                            
                            {payments[student.id] && payments[student.id].length > 0 ? (
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>Дата</strong></TableCell>
                                      <TableCell><strong>Сумма</strong></TableCell>
                                      <TableCell><strong>Описание</strong></TableCell>
                                      <TableCell><strong>Статус</strong></TableCell>
                                      <TableCell><strong>Действия</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {payments[student.id].map((payment) => (
                                      <TableRow 
                                        key={payment.id}
                                        sx={{ 
                                          backgroundColor: payment.is_deleted ? '#fff8e1' : 'inherit',
                                          textDecoration: payment.is_deleted ? 'line-through' : 'none'
                                        }}
                                      >
                                        <TableCell>{payment.payment_date}</TableCell>
                                        <TableCell>
                                          <Typography 
                                            sx={{ 
                                              color: payment.amount > 0 && !payment.is_deleted ? 'success.main' : 'text.secondary',
                                              fontWeight: payment.is_deleted ? 'normal' : 'bold'
                                            }}
                                          >
                                            {payment.amount} ₽
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          {payment.display_description || payment.description}
                                        </TableCell>
                                        <TableCell>
                                          {payment.is_deleted ? (
                                            <Chip 
                                              label="Удален" 
                                              size="small" 
                                              color="error" 
                                              variant="outlined"
                                            />
                                          ) : (
                                            <Chip 
                                              label="Активен" 
                                              size="small" 
                                              color="success" 
                                              variant="outlined"
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {payment.is_deleted ? (
                                            <Tooltip title="Восстановить платеж">
                                              <IconButton 
                                                size="small" 
                                                color="primary"
                                                onClick={() => handleRestorePayment(payment.id)}
                                              >
                                                <RestoreIcon />
                                              </IconButton>
                                            </Tooltip>
                                          ) : (
                                            <Tooltip title="Удалить платеж">
                                              <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDeletePayment(payment.id)}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                История платежей отсутствует
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Пополнение счета ученика
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Сумма пополнения"
              type="number"
              fullWidth
              variant="outlined"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Описание платежа"
              fullWidth
              variant="outlined"
              value={paymentData.description}
              onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
              sx={{ mb: 2 }}
              placeholder="Например: Оплата питания за январь"
            />
            <TextField
              margin="dense"
              label="Дата платежа"
              type="date"
              fullWidth
              variant="outlined"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddPayment} variant="contained">
              Добавить платеж
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

// Панель родителя/ученика
function ParentDashboard({ user, onLogout, onNotification }) {
  const [payments, setPayments] = useState([]);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token для платежей:', token);
      
      const response = await fetch(`${API_BASE}/api/students/${user.id}/payments`, {
        headers: {
          'Authorization': token
        }
      });
      
      console.log('📊 Статус ответа платежей:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Данные платежей:', data);
      setPayments(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки платежей:', error);
      onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
    }
  };

  const togglePayments = () => {
    setShowPayments(!showPayments);
    if (!showPayments) {
      fetchPayments();
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Личный кабинет
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.full_name}
            {user.student_id && ` (ID: ${user.student_id})`}
          </Typography>
          <Button color="inherit" onClick={onLogout}>Выйти</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {user.parent_name ? `Ученик: ${user.full_name}` : 'Мой баланс'}
        </Typography>

        <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {user.full_name}
            </Typography>
            {user.student_id && (
              <Typography color="textSecondary" gutterBottom>
                ID ученика: {user.student_id}
              </Typography>
            )}
            {user.parent_name && (
              <Typography color="textSecondary" gutterBottom>
                Родитель: {user.parent_name}
              </Typography>
            )}
            <Typography variant="h4" sx={{ mt: 2, color: 'primary.main' }}>
              Баланс: {user.balance || 0} ₽
            </Typography>
            <Button 
              onClick={togglePayments}
              sx={{ mt: 2 }}
              variant="outlined"
              fullWidth
            >
              {showPayments ? 'Скрыть' : 'Показать'} историю платежей
            </Button>
          </CardContent>
        </Card>

        {showPayments && payments.length > 0 && (
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
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow 
                      key={payment.id}
                      sx={{ 
                        backgroundColor: payment.is_deleted ? '#fff8e1' : 'inherit',
                        textDecoration: payment.is_deleted ? 'line-through' : 'none'
                      }}
                    >
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>
                        <Typography 
                          sx={{ 
                            color: payment.amount > 0 && !payment.is_deleted ? 'success.main' : 'text.secondary'
                          }}
                        >
                          {payment.amount} ₽
                        </Typography>
                      </TableCell>
                      <TableCell>{payment.display_description || payment.description}</TableCell>
                      <TableCell>
                        {payment.is_deleted ? (
                          <Chip 
                            label="Удален" 
                            size="small" 
                            color="error" 
                            variant="outlined"
                          />
                        ) : (
                          <Chip 
                            label="Активен" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {showPayments && payments.length === 0 && (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 2 }}>
            История платежей отсутствует
          </Typography>
        )}
      </Container>
    </Box>
  );
}

// Главный компонент App
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container component="main" maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <Typography variant="h6">Загрузка...</Typography>
          </Box>
        </Container>
      </ThemeProvider>
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
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;