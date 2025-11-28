import { useState } from 'react';
import { motion } from 'framer-motion';

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');

  // ⭐ Correct position + clean syntax
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.match('image.*')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResults(null);
      setDoctors([]);
      setError('');
    } else {
      setFile(null);
      setPreviewUrl('');
      setError('Please select a valid image (JPG/PNG).');
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return setError('Geolocation not supported.');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
        setLocation(coords);
        setLoading(false);
      },
      () => {
        setError('Unable to detect location automatically.');
        setLoading(false);
      }
    );
  };

  /* ---------------------------------------------------
      UPDATED ANALYSIS FUNCTION WITH DEPLOYED BACKEND
  --------------------------------------------------- */
  const handleAnalyze = async () => {
    if (!file) return setError('Upload an image first.');
    if (!location.trim()) return setError('Enter your city or PIN code.');
    setLoading(true);
    setError('');
    setResults(null);
    setDoctors([]);

    try {
      const base64Image = await fileToBase64(file);

      const analyzeRes = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType: file.type })
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || `HTTP ${analyzeRes.status}`);
      }

      const data = await analyzeRes.json();
      setResults(data);

      // Fetch dermatologist list if needed
      if (data.percentageLoss > 20) {
        const docRes = await fetch(`${API_BASE}/api/doctors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: location.trim(),
            specialty: 'dermatology'
          })
        });

        if (docRes.ok) {
          const docData = await docRes.json();
          setDoctors(docData.doctors || []);
        }
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setPreviewUrl('');
    setResults(null);
    setDoctors([]);
    setError('');
    setLocation('');
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-6xl bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                DermAI
              </h1>
            </div>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Advanced scalp analysis powered by AI. Get instant insights and connect with specialized dermatologists.
            </p>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid lg:grid-cols-2 gap-8 mb-12"
          >
            {/* Left Column - Image Upload */}
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-sm">1</div>
                  Upload Scalp Image
                </h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    {previewUrl ? (
                      <div className="relative">
                        <img src={previewUrl} alt="Preview" className="rounded-lg max-h-64 mx-auto object-cover shadow-lg" />
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Ready
                        </div>
                      </div>
                    ) : (
                      <div className="py-8">
                        <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">📷</span>
                        </div>
                        <p className="text-slate-300 font-medium">Click to upload image</p>
                        <p className="text-slate-500 text-sm mt-1">JPG or PNG, max 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Location */}
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-sm">2</div>
                  Your Location
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter city name or PIN code"
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                    <button
                      onClick={detectLocation}
                      disabled={loading}
                      className="px-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-lg font-semibold text-white transition flex items-center gap-2"
                    >
                      {loading ? '⌛' : '📍'}
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm">
                    We'll use this to find dermatologists near you. Your data is secure and private.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600 h-full flex flex-col">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-sm">3</div>
                  Analysis & Results
                </h3>

                <div className="flex-1 flex flex-col justify-center">
                  {previewUrl && (
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🔍</span>
                      </div>
                      <p className="text-slate-300 font-medium">Image ready for analysis</p>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={!file || !location || loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyzing Scalp Image...
                      </div>
                    ) : (
                      'Start AI Analysis'
                    )}
                  </button>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-red-900/30 border border-red-700 text-red-200 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              {/* Tabs */}
              <div className="flex border-b border-slate-700 mb-8">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                    activeTab === 'analysis'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📊 Analysis Report
                </button>
                <button
                  onClick={() => setActiveTab('doctors')}
                  className={`px-6 py-4 font-semibold border-b-2 transition-colors ${
                    activeTab === 'doctors'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  👨‍⚕️ Dermatologists ({doctors.length})
                </button>
              </div>

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-4 mb-8"
                  >
                    <div className="bg-emerald-900/30 p-4 rounded-xl text-center border border-emerald-700 min-h-[120px] flex flex-col justify-center">
                      <p className="text-emerald-400 text-sm font-medium mb-2">Hair Loss Grade</p>
                      <p className="text-white font-bold text-xl break-words">{results.grade}</p>
                    </div>

                    <div className="bg-teal-900/30 p-4 rounded-xl text-center border border-teal-700 min-h-[120px] flex flex-col justify-center">
                      <p className="text-teal-400 text-sm font-medium mb-2">Affected Area</p>
                      <p className="text-white font-bold text-2xl">{results.percentageLoss}%</p>
                    </div>

                    <div className="bg-purple-900/30 p-4 rounded-xl text-center border border-purple-700 min-h-[120px] flex flex-col justify-center">
                      <p className="text-purple-400 text-sm font-medium mb-2">Action Required</p>
                      <p className={`font-bold text-lg ${results.percentageLoss > 30 ? 'text-amber-400' : 'text-green-400'}`}>
                        {results.percentageLoss > 30 ? 'Consult' : 'Monitor'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Insights */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-emerald-900/30 to-slate-800 p-8 rounded-xl border border-emerald-700 shadow-lg"
                    >
                      <h3 className="text-2xl font-semibold text-emerald-400 mb-6 flex items-center gap-3">
                        <span className="text-lg">💡</span>
                        AI Insights
                      </h3>
                      <p className="text-slate-200 leading-relaxed text-lg">{results.analysisSummary}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-teal-900/30 to-slate-800 p-8 rounded-xl border border-teal-700 shadow-lg"
                    >
                      <h3 className="text-2xl font-semibold text-teal-400 mb-6 flex items-center gap-3">
                        <span className="text-lg">⚡</span>
                        Recommended Actions
                      </h3>
                      <ul className="space-y-4">
                        {results.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-4 text-slate-200">
                            <span className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-lg leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Consultation */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-gradient-to-br from-amber-900/30 to-slate-800 p-8 rounded-xl border border-amber-700 shadow-lg"
                  >
                    <h3 className="text-2xl font-semibold text-amber-400 mb-4 flex items-center gap-3">
                      <span className="text-lg">⚠️</span>
                      Professional Consultation
                    </h3>
                    <p className="text-slate-200 text-lg leading-relaxed">{results.doctorConsultationAdvice}</p>
                  </motion.div>
                </div>
              )}

              {/* Doctors Tab */}
              {activeTab === 'doctors' && (
                <div>
                  {doctors.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-semibold text-white">
                          Dermatologists near <span className="text-emerald-400">{location}</span>
                        </h3>
                        <span className="text-slate-400 text-lg bg-slate-700/50 px-4 py-2 rounded-full">
                          {doctors.length} specialists found
                        </span>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-8">
                        {doctors.map((doc, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.03 }}
                            className="bg-gradient-to-br from-slate-700/50 to-slate-800 border border-slate-600 p-8 rounded-xl hover:border-emerald-500 transition-all shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <h4 className="font-bold text-2xl text-white mb-2">{doc.name}</h4>
                                <p className="text-emerald-300 text-lg">{doc.qualification}</p>
                              </div>
                              <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
                                Available
                              </div>
                            </div>

                            <div className="space-y-4 text-slate-300 text-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 text-xl">🏥</span>
                                <span>{doc.address}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 text-xl">📞</span>
                                <a
                                  href={`tel:${doc.phone}`}
                                  className="text-emerald-400 hover:text-emerald-300 transition font-medium"
                                >
                                  {doc.phone}
                                </a>
                              </div>

                              {doc.website && (
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 text-xl">🌐</span>
                                  <a
                                    href={`https://${doc.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition font-medium"
                                  >
                                    Visit Website
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-600">
                              <span className="text-slate-500 text-sm">Reg: {doc.registration}</span>
                              <span className="text-slate-500 text-sm">{doc.source}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">👨‍⚕️</span>
                      </div>
                      <h4 className="text-2xl font-semibold text-slate-300 mb-4">No Dermatologists Found</h4>
                      <p className="text-slate-500 max-w-md mx-auto text-lg">
                        {results.percentageLoss <= 20
                          ? 'Your analysis shows minimal hair loss. Continue monitoring with our recommended tips.'
                          : 'Try searching with a different location or check back later for available specialists.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Reset Button */}
          {results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-8 border-t border-slate-700"
            >
              <button
                onClick={resetApp}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-4 px-10 rounded-xl transition-all flex items-center gap-3 text-lg"
              >
                <span>🔄</span>
                New Analysis
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 border-t border-slate-700 p-6 text-center">
          <p className="text-slate-500 text-sm">
            Powered by Advanced AI Analysis • Your privacy is protected • Medical-grade insights
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
