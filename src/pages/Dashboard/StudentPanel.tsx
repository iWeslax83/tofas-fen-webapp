import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { motion } from "framer-motion";

export default function StudentPanel() {
  useAuth(["student"]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("activeUser") || "null");

  const handleLogout = () => {
    localStorage.removeItem("activeUser");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (!user || user.rol !== "student") {
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

  const menuItems = [
    { 
      to: "/student/odevler", 
      icon: "📘", 
      title: "Ödevler",
      description: "Ödev listesi ve teslim durumu"
    },
    { 
      to: "/student/ders-programi", 
      icon: "🗓️", 
      title: "Ders Programı",
      description: "Haftalık ders programı"
    },
    { 
      to: "/student/notlar", 
      icon: "📝", 
      title: "Notlar",
      description: "Sınav ve proje notları"
    },
    { 
      to: "/student/duyurular", 
      icon: "📢", 
      title: "Duyurular",
      description: "Okul ve sınıf duyuruları"
    },
    { 
      to: "/student/kulupler", 
      icon: "🤝", 
      title: "Kulüpler",
      description: "Kulüpler ve topluluklar"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardHoverVariants = {
    hover: {
      scale: 1.05,
      rotateY: 5,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header */}
      <motion.div 
        className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl"
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                🎓
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Öğrenci Paneli
                </h1>
                <p className="text-slate-300 text-sm">TOFAŞ Fen Lisesi</p>
              </div>
            </div>
            <motion.button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg font-medium transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Çıkış Yap
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div 
            className="user-profile-card max-w-md mx-auto"
            variants={cardHoverVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <motion.img 
              src="https://api.dicebear.com/7.x/thumbs/svg?seed=TofasUser" 
              alt="avatar"
              className="w-16 h-16 rounded-full border-4 border-yellow-400 shadow-lg"
              whileHover={{ rotate: 10 }}
              transition={{ duration: 0.3 }}
            />
            <div className="ml-4">
              <motion.h3 
                className="text-xl font-semibold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Hoş geldiniz, {user.adSoyad || "öğrenci"}!
              </motion.h3>
              <motion.p 
                className="text-slate-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {user.sinif}/{user.sube} • Öğrenci
              </motion.p>
            </div>
          </motion.div>
        </motion.div>

        {/* Menu Grid */}
        <motion.div 
          className="tofas-button-group"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Link
                to={item.to}
                className="block"
              >
                <motion.div
                  className="panel-button group relative overflow-hidden"
                  variants={cardHoverVariants}
                >
                  {/* Background gradient on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ borderRadius: 'inherit' }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-between w-full">
                    <div className="flex items-center space-x-4">
                      <motion.span 
                        className="text-3xl"
                        whileHover={{ 
                          scale: 1.3, 
                          rotate: 15,
                          filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))"
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {item.icon}
                      </motion.span>
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-white transition-colors duration-300">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors duration-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      className="text-slate-400 group-hover:text-white transition-colors duration-300"
                      whileHover={{ x: 5 }}
                    >
                      →
                    </motion.div>
                  </div>

                  {/* Shine effect */}
                  <motion.div
                    className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "300%" }}
                    transition={{ duration: 0.8 }}
                  />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {[
            { title: "Bekleyen Ödev", value: "3", icon: "📚", color: "from-blue-500 to-cyan-500" },
            { title: "Bu Hafta Ders", value: "24", icon: "🗓️", color: "from-green-500 to-emerald-500" },
            { title: "Ortalama", value: "87.5", icon: "📊", color: "from-purple-500 to-pink-500" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" 
              }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <motion.div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {stat.icon}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <p className="text-slate-400 text-sm">
            © 2024 TOFAŞ Fen Lisesi • Öğrenci Bilgi Sistemi
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}