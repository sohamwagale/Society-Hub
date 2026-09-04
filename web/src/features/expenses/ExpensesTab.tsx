import React, { useState } from 'react';
import { Plus, Paperclip } from 'lucide-react';
import { expensesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import AddExpenseModal from './components/AddExpenseModal';
import { toast } from '../../components/Toast';
import { useExpensesQuery, useCreateExpenseMutation } from '../../hooks/queries/useExpenses';

export const ExpensesTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: expenses = [] } = useExpensesQuery();
  const createExpenseMutation = useCreateExpenseMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseFile, setExpenseFile] = useState<File | null>(null);

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExpenseMutation.mutateAsync({
        expense: {
          title: expenseTitle,
          description: expenseDesc,
          amount: expenseAmount,
          expense_date: expenseDate,
        },
        file: expenseFile || undefined,
      });

      setIsSuccess(true);
      toast.success('Expenditure logged successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setExpenseTitle('');
        setExpenseDesc('');
        setExpenseAmount(0);
        setExpenseDate('');
        setExpenseFile(null);
      }, 1000);
    } catch {
      toast.error('Failed to record expense.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Society Expenditures Ledger</h3>
          <p className="text-slate-500 text-xs mt-1">Audit expenditures logged by the management board.</p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            <a
              href={expensesAPI.getExportCsvUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Paperclip size={14} /> Export CSV
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Log Expenditure
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/50">
              <th className="p-3.5 font-bold">Expense Title</th>
              <th className="p-3.5 font-bold">Spent On</th>
              <th className="p-3.5 font-bold">Amount</th>
              <th className="p-3.5 font-bold text-right">Invoice File</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  No expenditures recorded in this society yet.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-800">{exp.title}</p>
                    <p className="text-slate-500 text-[10px]">{exp.description || 'Administrative expense.'}</p>
                  </td>
                  <td className="p-3.5 font-medium text-slate-600">
                    {new Date(exp.expense_date).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 text-sm">
                    ₹{exp.amount.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right">
                    {exp.document_url ? (
                      <a
                        href={expensesAPI.getDocumentUrl(exp.document_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                      >
                        <Paperclip size={12} /> Voucher
                      </a>
                    ) : (
                      <span className="text-slate-400">No Voucher</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        isSuccess={isSuccess}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleLogExpense}
        expenseTitle={expenseTitle}
        setExpenseTitle={setExpenseTitle}
        expenseDesc={expenseDesc}
        setExpenseDesc={setExpenseDesc}
        expenseAmount={expenseAmount}
        setExpenseAmount={setExpenseAmount}
        expenseDate={expenseDate}
        setExpenseDate={setExpenseDate}
        setExpenseFile={setExpenseFile}
      />
    </div>
  );
};

export default ExpensesTab;
