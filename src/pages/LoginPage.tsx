// File: src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import studentCredentials from "../data/ogrenci_sifreleri.json";
import parentCredentials from "../data/veli_sifreleri.json";
import teacherCredentials from "../data/ogretmen_sifreleri.json";
import adminCredentials from "../data/yonetici_sifreleri.json";

interface User {
  id: string;
  sifre: string;
  adSoyad?: string;
}

export function LoginPage() {
  const [id, setId] = useState("");
  const [sifre, setSifre] = useState("");
  const [rolBulundu, setRolBulundu] = useState("");
  const [adSoyad, setAdSoyad] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("activeUser") || "null");
    if (user?.rol) {
      navigate(`/dashboard/${user.rol}`);
    }
  }, [navigate]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(false);

    // Simulated loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    const roleOrder: { data: User[]; rol: string }[] = [
      { data: adminCredentials as User[], rol: "admin" },
      { data: teacherCredentials as User[], rol: "teacher" },
      { data: parentCredentials as User[], rol: "parent" },
      { data: studentCredentials as User[], rol: "student" },
    ];

    for (const { data, rol } of roleOrder) {
      const match = data.find((u) => u.id === id && u.sifre === sifre);
      if (match) {
        const userWithRole = { ...match, rol };
        localStorage.setItem("activeUser", JSON.stringify(userWithRole));
        localStorage.setItem("loginTime", Date.now().toString());

        setRolBulundu(rol);
        setAdSoyad(match.adSoyad || "");

        const logEntry = {
          timestamp: new Date().toISOString(),
          id: match.id,
          adSoyad: match.adSoyad || "",
          rol,
        };

        const logs = JSON.parse(localStorage.getItem("loginLogs") || "[]");
        logs.push(logEntry);
        localStorage.setItem("loginLogs", JSON.stringify(logs));

        setTimeout(() => navigate(`/dashboard/${rol}`), 1000);
        setIsLoading(false);
        return;
      }
    }

    setError(true);
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo and Header */}
          <motion.div
            className="text-center mb-8"
            variants={itemVariants}
          >
            <motion.div
              className="relative inline-block mb-6"
              variants={floatingVariants}
              animate="animate"
            >
              <img
                src="/tofaslogo.png"
                alt="TOFAŞ Logo"
                className="w-20 h-20 mx-auto rounded-full border-4 border-yellow-400 shadow-2xl bg-white"
              />
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </motion.div>
            <motion.h1
              className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-2"
              variants={itemVariants}
            >
              TOFAŞ Fen Lisesi
            </motion.h1>
            <motion.p
              className="text-slate-300 text-lg"
              variants={itemVariants}
            >
              Bilgi Sistemi Giriş
            </motion.p>
          </motion.div>

          {/* Login Form */}
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="login-card space-y-6"
            variants={itemVariants}
          >
            <AnimatePresence mode="wait">
              {!rolBulundu ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* User ID Field */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Kullanıcı ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Kullanıcı ID'nizi girin"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                        disabled={isLoading}
                      />
                      <motion.div
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        animate={{ rotate: id ? 0 : 180 }}
                      >
                        <span className="text-slate-400">👤</span>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Password Field */}
                  <motion.div variants={itemVariants}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrenizi girin"
                        value={sifre}
                        onChange={(e) => setSifre(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                        disabled={isLoading}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition-colors duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {showPassword ? "🙈" : "👁"}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    disabled={isLoading || !id || !sifre}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    variants={itemVariants}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center"
                        >
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          />
                          Giriş Yapılıyor...
                        </motion.div>
                      ) : (
                        <motion.span
                          key="text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          Giriş Yap
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Button shine effect */}
                    <motion.div
                      className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                      animate={{ left: ["−100%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    ✓
                  </motion.div>
                  <p className="text-green-400 text-lg font-semibold">
                    {adSoyad && <span>{adSoyad} - </span>}
                    {rolBulundu.toUpperCase()} olarak giriş yapılıyor...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl backdrop-blur-xl"
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-2">⚠️</span>
                    <span>Kullanıcı ID veya şifre hatalı. Lütfen tekrar deneyin.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Footer */}
          <motion.div
            className="text-center mt-8"
            variants={itemVariants}
          >
            <p className="text-slate-400 text-sm">
              © 2024 TOFAŞ Fen Lisesi • Güvenli Giriş Sistemi
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
