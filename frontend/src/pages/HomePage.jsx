import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users, BookOpen, ArrowRight } from 'lucide-react';

/**
 * HomePage Component
 * Landing page with app overview and quick actions
 */
const HomePage = ({ user }) => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Video className="w-8 h-8" />,
      title: 'Video Meetings',
      description: 'High-quality video calls with screen sharing and recording capabilities'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Collaborative Whiteboard',
      description: 'Real-time drawing and annotation tools for interactive sessions'
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Educational Tools',
      description: 'Purpose-built for teaching with breakout rooms and student engagement features'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">EduMeet</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Welcome, {user.username}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Now available with enhanced collaboration tools
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight">
            <span className="block">Transform Your</span>
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Online Education
            </span>
          </h1>
          
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 leading-relaxed">
            Connect, collaborate, and create with our comprehensive platform designed for modern education. 
            Video meetings, interactive whiteboards, and real-time collaboration tools all in one place.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={() => navigate('/dashboard?tab=join')}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Join Meeting
            </button>
          </div>
          
          <div className="mt-12 flex justify-center items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Free to use
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              No download required
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
              Secure & private
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-6">
              ✨ Powerful Features
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need for 
              <span className="block text-blue-600">online education</span>
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-xl text-gray-600">
              Built specifically for educators and students with tools that enhance learning and engagement
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-24 bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl shadow-xl p-10 border border-blue-100">
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200 mb-4">
              ⚡ Quick Actions
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to get started?</h2>
            <p className="text-gray-600 text-lg">Jump right into your educational activities in seconds</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button
              onClick={() => navigate('/dashboard?tab=create')}
              className="group relative bg-white p-8 border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Start New Meeting</h3>
                  <p className="text-gray-600">Create an instant meeting or schedule for later</p>
                  <div className="flex items-center mt-3 text-blue-600 font-medium">
                    <span>Get started</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/dashboard?tab=join')}
              className="group relative bg-white p-8 border-2 border-green-200 rounded-2xl hover:border-green-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="ml-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Join Meeting</h3>
                  <p className="text-gray-600">Enter a meeting ID to join an existing session</p>
                  <div className="flex items-center mt-3 text-green-600 font-medium">
                    <span>Join now</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl"></div>
          <div className="absolute inset-0 bg-black/20 rounded-3xl"></div>
          <div className="relative py-20 px-8 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30 mb-6 backdrop-blur-sm">
              🚀 Get Started Today
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to transform
              <span className="block text-yellow-300">your educational experience?</span>
            </h2>
            <p className="mt-4 text-xl text-blue-100 max-w-2xl mx-auto">
              Join thousands of educators and students using EduMeet to create engaging online learning experiences
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group relative px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span className="relative flex items-center">
                  Start Free Trial
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button className="group px-8 py-4 bg-transparent text-white rounded-xl font-semibold border-2 border-white/30 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm">
                <span className="flex items-center">
                  Schedule Demo
                  <svg className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </button>
            </div>
            
            {/* Floating elements for visual appeal */}
            <div className="absolute top-6 left-6 w-20 h-20 bg-yellow-300/20 rounded-full blur-xl"></div>
            <div className="absolute bottom-6 right-6 w-32 h-32 bg-purple-300/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 text-center text-gray-500">
            <p>&copy; 2025 EduMeet. Built for modern education.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;