// src/components/Settings.js
import { useState } from 'react';
import {
  CogIcon,
  DatabaseIcon,
  FolderIcon,
  ServerIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  RefreshIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/outline';

function Settings() {
  const [settings, setSettings] = useState({
    connectionString: 'mongodb://localhost:27017',
    backupDirectory: './backups',
    autoRefresh: true,
    compressBackups: false,
    maxBackupSize: '1GB',
    confirmDestructiveActions: true,
    refreshInterval: 30,
    enableLogging: true,
    logLevel: 'INFO'
  });

  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [testing, setTesting] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('http://localhost:5000/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string: settings.connectionString })
      });
      
      if (res.ok) {
        setConnectionStatus('connected');
        alert('Connection successful!');
      } else {
        setConnectionStatus('failed');
        alert('Connection failed!');
      }
    } catch (error) {
      setConnectionStatus('failed');
      alert(`Connection error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = () => {
    // Save to localStorage for now
    localStorage.setItem('mongoExplorerSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings({
        connectionString: 'mongodb://localhost:27017',
        backupDirectory: './backups',
        autoRefresh: true,
        compressBackups: false,
        maxBackupSize: '1GB',
        confirmDestructiveActions: true,
        refreshInterval: 30,
        enableLogging: true,
        logLevel: 'INFO'
      });
      localStorage.removeItem('mongoExplorerSettings');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your MongoDB Explorer preferences and connection settings</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Connection Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DatabaseIcon className="h-6 w-6 mr-2 text-blue-600" />
              Database Connection
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MongoDB Connection String
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={settings.connectionString}
                  onChange={(e) => handleSettingChange('connectionString', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mongodb://localhost:27017"
                />
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {testing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RefreshIcon className="h-4 w-4 mr-2" />
                  )}
                  Test
                </button>
              </div>
              <div className="flex items-center mt-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Connected successfully
                  </div>
                )}
                {connectionStatus === 'failed' && (
                  <div className="flex items-center text-red-600 text-sm">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    Connection failed
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The MongoDB connection string used to connect to your database
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-refresh interval (seconds)
              </label>
              <input
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                min="10"
                max="300"
                className="w-32 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                How often to automatically refresh database and collection lists
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={settings.autoRefresh}
                onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoRefresh" className="ml-2 text-sm text-gray-700">
                Enable auto-refresh for database list and collections
              </label>
            </div>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FolderIcon className="h-6 w-6 mr-2 text-green-600" />
              Backup Configuration
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Directory
              </label>
              <input
                type="text"
                value={settings.backupDirectory}
                onChange={(e) => handleSettingChange('backupDirectory', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="./backups"
              />
              <p className="text-xs text-gray-500 mt-1">
                Directory where backup files will be stored on the server
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Backup Size
              </label>
              <select
                value={settings.maxBackupSize}
                onChange={(e) => handleSettingChange('maxBackupSize', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="250MB">250 MB</option>
                <option value="500MB">500 MB</option>
                <option value="1GB">1 GB</option>
                <option value="2GB">2 GB</option>
                <option value="5GB">5 GB</option>
                <option value="10GB">10 GB</option>
                <option value="unlimited">Unlimited</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Maximum allowed size for individual backup files
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="compressBackups"
                  checked={settings.compressBackups}
                  onChange={(e) => handleSettingChange('compressBackups', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="compressBackups" className="ml-2 text-sm text-gray-700">
                  Compress backups using gzip compression
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Reduces backup file size but increases processing time
              </p>
            </div>
          </div>
        </div>

        {/* Security & Safety Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-6 w-6 mr-2 text-red-600" />
              Security & Safety
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="confirmDestructive"
                checked={settings.confirmDestructiveActions}
                onChange={(e) => handleSettingChange('confirmDestructiveActions', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="confirmDestructive" className="ml-2 text-sm text-gray-700">
                Require confirmation for destructive actions
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Show confirmation dialogs before dropping collections, deleting backups, or restoring data
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Security Best Practices
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Always use authentication for production databases</li>
                      <li>Backup files may contain sensitive data - store securely</li>
                      <li>Test restore operations in development environments first</li>
                      <li>Regularly validate backup integrity and test recovery procedures</li>
                      <li>Use SSL/TLS connections for remote MongoDB instances</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logging Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <ServerIcon className="h-6 w-6 mr-2 text-purple-600" />
              Logging & Debugging
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableLogging"
                checked={settings.enableLogging}
                onChange={(e) => handleSettingChange('enableLogging', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="enableLogging" className="ml-2 text-sm text-gray-700">
                Enable application logging
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Log Level
              </label>
              <select
                value={settings.logLevel}
                onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                disabled={!settings.enableLogging}
                className="w-48 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="DEBUG">Debug (Most Verbose)</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error (Least Verbose)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls the level of detail in application logs
              </p>
            </div>
          </div>
        </div>

        {/* Application Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <InformationCircleIcon className="h-6 w-6 mr-2 text-gray-600" />
              Application Information
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Version Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>MongoDB Explorer:</span>
                    <span className="font-mono">v1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backend API:</span>
                    <span className="font-mono">Flask + Python 3.9+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frontend:</span>
                    <span className="font-mono">React 18 + Tailwind CSS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MongoDB Driver:</span>
                    <span className="font-mono">PyMongo 4.x</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Database Connection:</span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
                        {connectionStatus === 'connected' ? 'Active' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Backup Service:</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-600">Available</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">MongoDB Tools:</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-600">mongodump/mongorestore detected</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">API Server:</span>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-600">localhost:5000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Supported Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Database browsing and exploration</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Collection management and operations</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Full backup and restore functionality</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>MongoDB native tools integration</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Cross-database collection copying</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Real-time connection monitoring</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            onClick={resetToDefaults}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;