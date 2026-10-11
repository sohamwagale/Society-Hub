import React, { useState } from 'react';
import { Plus, Paperclip, Receipt } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { expensesAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import AddExpenseModal from './components/AddExpenseModal';
import { toast } from '../../components/Toast';
import { useExpensesQuery, useCreateExpenseMutation } from '../../hooks/queries/useExpenses';
import { ExpensesSkeleton } from '../../components/skeleton';

export const ExpensesTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: expenses = [], isLoading } = useExpensesQuery();
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

  if (isLoading && expenses.length === 0) {
    return <ExpensesSkeleton />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Society Expenditures Ledger</h3>
          <p className="text-slate-500 text-xs mt-1">Audit expenditures logged by the management board.</p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2 flex-wrap">
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 min-h-11"
            >
              <Plus size={16} /> Log expenditure
            </button>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenditures yet"
          description="The committee has not logged any society expenses."
          action={
            user?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm min-h-11"
              >
                Log the first expense
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <p className="font-bold text-slate-800">{exp.title}</p>
                <p className="text-sm text-slate-500 mt-1">{exp.description || 'Administrative expense.'}</p>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-slate-500">{new Date(exp.expense_date).toLocaleDateString()}</span>
                  <span className="font-bold">₹{exp.amount.toLocaleString()}</span>
                </div>
                {exp.document_url && (
                  <a
                    href={expensesAPI.getDocumentUrl(exp.document_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 font-bold mt-2"
                  >
                    <Paperclip size={14} /> Voucher
                  </a>
                )}
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="p-3.5 font-bold">Expense title</th>
                  <th className="p-3.5 font-bold">Spent on</th>
                  <th className="p-3.5 font-bold">Amount</th>
                  <th className="p-3.5 font-bold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3.5">
                      <p className="font-bold text-slate-800">{exp.title}</p>
                      <p className="text-slate-500 text-xs">{exp.description || 'Administrative expense.'}</p>
                    </td>
                    <td className="p-3.5 font-medium text-slate-600">
                      {new Date(exp.expense_date).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">₹{exp.amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      {exp.document_url ? (
                        <a
                          href={expensesAPI.getDocumentUrl(exp.document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 font-bold hover:underline"
                        >
                          <Paperclip size={12} /> Voucher
                        </a>
                      ) : (
                        <span className="text-slate-400">No voucher</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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
