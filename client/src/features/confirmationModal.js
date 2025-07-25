// src/components/ConfirmationModal.jsx
import { ExclamationIcon } from '@heroicons/react/outline';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    // Main modal container with a semi-transparent background
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity">
      
      {/* Modal panel */}
      <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl">
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
            <ExclamationIcon className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {children}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;