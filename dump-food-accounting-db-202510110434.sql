--
-- PostgreSQL database dump
--

\restrict sj2GK0NnYqHuSgFl6LQ05KMYradcnGdWwDNcB2enzGyC7Wy7HPtZQtOCc7cuLIb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-10-11 04:34:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 225 (class 1255 OID 16555)
-- Name: get_student_balance(integer, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_student_balance(student_id integer, target_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE sql
    AS $_$
    SELECT COALESCE(SUM(amount), 0)
    FROM payments 
    WHERE student_id = $1 AND payment_date <= $2;
$_$;


ALTER FUNCTION public.get_student_balance(student_id integer, target_date date) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 16856)
-- Name: admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    password character varying(100) NOT NULL
);


ALTER TABLE public.admin OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16855)
-- Name: admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_id_seq OWNER TO postgres;

--
-- TOC entry 4828 (class 0 OID 0)
-- Dependencies: 223
-- Name: admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_id_seq OWNED BY public.admin.id;


--
-- TOC entry 222 (class 1259 OID 16841)
-- Name: parents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parents (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    password character varying(100) NOT NULL,
    parent__id integer,
    usertype character varying
);


ALTER TABLE public.parents OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16840)
-- Name: parents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parents_id_seq OWNER TO postgres;

--
-- TOC entry 4829 (class 0 OID 0)
-- Dependencies: 221
-- Name: parents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parents_id_seq OWNED BY public.parents.id;


--
-- TOC entry 220 (class 1259 OID 16831)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    student_id integer,
    payment_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16830)
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- TOC entry 4830 (class 0 OID 0)
-- Dependencies: 219
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- TOC entry 218 (class 1259 OID 16823)
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    student_id integer,
    balance real,
    parent_id integer
);


ALTER TABLE public.students OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16822)
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- TOC entry 4831 (class 0 OID 0)
-- Dependencies: 217
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- TOC entry 4661 (class 2604 OID 16859)
-- Name: admin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin ALTER COLUMN id SET DEFAULT nextval('public.admin_id_seq'::regclass);


--
-- TOC entry 4660 (class 2604 OID 16844)
-- Name: parents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents ALTER COLUMN id SET DEFAULT nextval('public.parents_id_seq'::regclass);


--
-- TOC entry 4658 (class 2604 OID 16834)
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- TOC entry 4657 (class 2604 OID 16826)
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- TOC entry 4822 (class 0 OID 16856)
-- Dependencies: 224
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin (id, full_name, password) FROM stdin;
1	Тест админ	1357911Dan
\.


--
-- TOC entry 4820 (class 0 OID 16841)
-- Dependencies: 222
-- Data for Name: parents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parents (id, full_name, password, parent__id, usertype) FROM stdin;
1	Иванов Иван Иванович	123	1	parent
2	Петров Пётр Петрович	123	2	parent
3	Данилов Данил Данилович	123	3	parent
\.


--
-- TOC entry 4818 (class 0 OID 16831)
-- Dependencies: 220
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, student_id, payment_date, amount, description, created_at, created_by) FROM stdin;
1	1	2025-10-08	100.00	афа12040 _12!!!	2025-10-09 00:59:51.236082	1
2	2	2025-10-09	-100.00	test 2 !$@#$	2025-10-09 18:23:12.660898	1
\.


--
-- TOC entry 4816 (class 0 OID 16823)
-- Dependencies: 218
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, full_name, student_id, balance, parent_id) FROM stdin;
1	Иванов Илья Иванович	1	0	1
2	Петров Илья Петрович	2	0	2
3	Данилов Илья Данилович	3	0	3
\.


--
-- TOC entry 4832 (class 0 OID 0)
-- Dependencies: 223
-- Name: admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_id_seq', 1, false);


--
-- TOC entry 4833 (class 0 OID 0)
-- Dependencies: 221
-- Name: parents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parents_id_seq', 1, false);


--
-- TOC entry 4834 (class 0 OID 0)
-- Dependencies: 219
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 2, true);


--
-- TOC entry 4835 (class 0 OID 0)
-- Dependencies: 217
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 1, false);


--
-- TOC entry 4669 (class 2606 OID 16861)
-- Name: admin admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (id);


--
-- TOC entry 4667 (class 2606 OID 16848)
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id);


--
-- TOC entry 4665 (class 2606 OID 16839)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 4663 (class 2606 OID 16828)
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


-- Completed on 2025-10-11 04:34:18

--
-- PostgreSQL database dump complete
--

\unrestrict sj2GK0NnYqHuSgFl6LQ05KMYradcnGdWwDNcB2enzGyC7Wy7HPtZQtOCc7cuLIb

