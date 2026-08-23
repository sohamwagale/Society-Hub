import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2 } from 'lucide-react';
import type { SocietyDocument } from '../../types';
import { documentsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import UploadDocumentModal from './components/UploadDocumentModal';

export const DocumentsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<SocietyDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const loadDocuments = async () => {
    try {
      const list = await documentsAPI.list();
      setDocuments(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    try {
      await documentsAPI.upload(docTitle, docFile, docDesc);
      alert('Document submitted successfully!');
      setIsModalOpen(false);
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      loadDocuments();
    } catch (e) {
      alert('Failed to upload document.');
    }
  };

  const handleApproveDocument = async (id: string) => {
    try {
      await documentsAPI.approve(id);
      loadDocuments();
    } catch (e) {
      alert('Failed to approve document.');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      loadDocuments();
    } catch (e) {
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Communal Document Vault</h3>
          <p className="text-slate-500 text-xs mt-1">
            Access society rules, board meeting minutes, templates, and safety audits.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Upload size={14} /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.length === 0 ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-12">No document logs uploaded.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                    {doc.file_type}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      doc.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {doc.is_approved ? 'Approved' : 'Pending Review'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-base mt-3 truncate">{doc.title}</h4>
                <p className="text-slate-500 text-xs mt-1 line-clamp-2">
                  {doc.description || 'Official society ledger/document file.'}
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Uploaded by {doc.uploader_name || 'Admin'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                <a
                  href={documentsAPI.getFileUrl(doc.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                >
                  <Download size={12} /> View File
                </a>

                <div className="flex gap-2">
                  {user?.role === 'admin' && !doc.is_approved && (
                    <button
                      onClick={() => handleApproveDocument(doc.id)}
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded"
                    >
                      Approve
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <UploadDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUploadDocument}
        docTitle={docTitle}
        setDocTitle={setDocTitle}
        docDesc={docDesc}
        setDocDesc={setDocDesc}
        setDocFile={setDocFile}
      />
    </div>
  );
};

export default DocumentsTab;
