import React, { useState } from 'react';
import { Upload, Download, Trash2, FileText, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import type { SocietyDocument } from '../../types';
import { documentsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import UploadDocumentModal from './components/UploadDocumentModal';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import {
  useDocumentsQuery,
  useUploadDocumentMutation,
  useApproveDocumentMutation,
  useDeleteDocumentMutation,
} from '../../hooks/queries/useDocuments';
import { DocumentsSkeleton } from '../../components/skeleton';

export const DocumentsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: documents = [], isLoading } = useDocumentsQuery();
  const uploadDocumentMutation = useUploadDocumentMutation();
  const approveDocumentMutation = useApproveDocumentMutation();
  const deleteDocumentMutation = useDeleteDocumentMutation();

  const [selectedDoc, setSelectedDoc] = useState<SocietyDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    try {
      await uploadDocumentMutation.mutateAsync({
        title: docTitle,
        file: docFile,
        description: docDesc,
      });
      setIsSuccess(true);
      toast.success('Document uploaded successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setDocTitle('');
        setDocDesc('');
        setDocFile(null);
      }, 1000);
    } catch {
      toast.error('Failed to upload document.');
    }
  };

  const handleApproveDocument = async (id: string) => {
    try {
      await approveDocumentMutation.mutateAsync(id);
      toast.success('Document approved!');
    } catch {
      toast.error('Failed to approve document.');
    }
  };

  const handleDeleteDocument = (id: string) => {
    confirmDialog({
      title: 'Delete Document File?',
      message: 'Are you sure you want to delete this document from the vault?',
      confirmText: 'Delete Document',
      onConfirm: async () => {
        try {
          await deleteDocumentMutation.mutateAsync(id);
          toast.success('Document deleted!');
        } catch {
          toast.error('Failed to delete document.');
        }
      },
    });
  };

  if (isLoading && documents.length === 0) {
    return <DocumentsSkeleton />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Communal Document Vault</h3>
          <p className="text-slate-500 text-sm mt-1">
            Access society bylaws, AGM minutes, vendor agreements, and safety audits.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-h-11 shadow-sm"
        >
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents uploaded yet"
          description="The society vault is empty. Upload meeting minutes, guidelines, or notices for all members."
          action={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-11 shadow-sm"
            >
              Upload first document
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Master List */}
          <div className="lg:col-span-2 space-y-3">
            {documents.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/20 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded uppercase">
                        {doc.file_type}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          doc.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {doc.is_approved ? (
                          <>
                            <CheckCircle2 size={12} /> Approved
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Pending Review
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={documentsAPI.getFileUrl(doc.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg min-h-9 min-w-9 flex items-center justify-center"
                        title="Download file"
                      >
                        <Download size={16} />
                      </a>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg min-h-9 min-w-9 flex items-center justify-center"
                          title="Delete file"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 text-base mt-2.5">{doc.title}</h4>
                  <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                    {doc.description || 'Official society ledger or communal document file.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-3 text-right">
                    Uploaded by <span className="font-medium text-slate-600">{doc.uploader_name || 'Admin'}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detail Preview Pane */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[360px] lg:min-h-[500px]">
            {!selectedDoc ? (
              <div className="text-center py-20 my-auto">
                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                <h5 className="font-bold text-slate-700 text-base">Select a document</h5>
                <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                  Click on any document from the vault to inspect details, verify approval, or preview.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded uppercase">
                        {selectedDoc.file_type}
                      </span>
                      <h4 className="font-bold text-slate-800 text-lg mt-2">{selectedDoc.title}</h4>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        selectedDoc.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {selectedDoc.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Description</p>
                      <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">
                        {selectedDoc.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase">Uploaded By</p>
                      <p className="mt-0.5 font-medium text-slate-800">{selectedDoc.uploader_name || 'Admin'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <a
                    href={documentsAPI.getFileUrl(selectedDoc.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl min-h-11 shadow-sm transition-colors"
                  >
                    <ExternalLink size={16} /> Open & Download File
                  </a>

                  {user?.role === 'admin' && !selectedDoc.is_approved && (
                    <button
                      onClick={() => handleApproveDocument(selectedDoc.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl min-h-11 transition-colors shadow-sm"
                    >
                      <CheckCircle2 size={16} /> Approve for Community
                    </button>
                  )}

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteDocument(selectedDoc.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-semibold text-sm rounded-xl min-h-11 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Document
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <UploadDocumentModal
        isOpen={isModalOpen}
        isSuccess={isSuccess}
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
