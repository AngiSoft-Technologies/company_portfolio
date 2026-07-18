import {
  FaInfoCircle, FaBriefcase, FaGlobe, FaPuzzlePiece, FaCogs,
  FaCode, FaMobileAlt, FaChartLine, FaBrain,
  FaCashRegister, FaServer,
  FaGraduationCap, FaFileAlt, FaAd, FaWifi, FaMusic,
  FaStethoscope, FaStore, FaLandmark, FaBuilding, FaTruck,
  FaReact, FaPython, FaHtml5, FaTerminal,
  FaBug, FaArrowUp, FaDesktop, FaBoxOpen, FaPaintBrush,
  FaUsers, FaFileContract, FaUserTie, FaClipboardList,
  FaWarehouse, FaCreditCard, FaUniversity, FaHeartbeat, FaBoxes,
  FaDatabase, FaShieldAlt, FaBullhorn, FaLaptopCode,
  FaEnvelope, FaPhoneAlt, FaArrowRight, FaCheckCircle,
  FaRocket, FaClock, FaDollarSign, FaStar, FaQuoteLeft,
  FaChevronLeft, FaChevronRight, FaArrowLeft, FaUsers as FaUsersIcon,
  FaBars, FaTimes, FaChevronDown, FaSearch,
} from 'react-icons/fa';
import { SiFlutter, SiKotlin, SiTailwindcss } from 'react-icons/si';

// Single source of truth mapping icon *names* (stored as strings in CMS/seeds)
// to actual react-icons components. Frontend components that render a dynamic
// icon from a data field (header nav, services, industries, tech platforms)
// should resolve through this registry; any name not present falls back to
// FaGlobe so a single bad string never breaks the render.
const iconRegistry = {
  FaInfoCircle, FaBriefcase, FaGlobe, FaPuzzlePiece, FaCogs,
  FaCode, FaMobileAlt, FaChartLine, FaBrain,
  FaCashRegister, FaServer,
  FaGraduationCap, FaFileAlt, FaAd, FaWifi, FaMusic,
  FaStethoscope, FaStore, FaLandmark, FaBuilding, FaTruck,
  FaReact, FaPython, FaHtml5, FaTerminal,
  FaBug, FaArrowUp, FaDesktop, FaBoxOpen, FaPaintBrush,
  FaUsers, FaFileContract, FaUserTie, FaClipboardList,
  FaWarehouse, FaCreditCard, FaUniversity, FaHeartbeat, FaBoxes,
  FaDatabase, FaShieldAlt, FaBullhorn, FaLaptopCode,
  FaEnvelope, FaPhoneAlt, FaArrowRight, FaCheckCircle,
  FaRocket, FaClock, FaDollarSign, FaStar, FaQuoteLeft,
  FaChevronLeft, FaChevronRight, FaArrowLeft,
  FaBars, FaTimes, FaChevronDown, FaSearch,
  SiFlutter, SiKotlin, SiTailwindcss,
};

export const resolveIcon = (name) => iconRegistry[name] || FaGlobe;

export default iconRegistry;
