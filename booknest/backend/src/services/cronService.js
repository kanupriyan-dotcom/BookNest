const cron = require('node-cron');
const Borrowing = require('../models/borrowing');

const runOverdueCheck = async () => {
  try {
    const today = new Date();
    
    // Find all active loans past their due date
    const overdueLoans = await Borrowing.find({
      status: 'borrowed',
      dueDate: { $lt: today },
    });

    for (const loan of overdueLoans) {
      const diffTime = Math.abs(today - loan.dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const fine = diffDays * 5.0; // ₹5.00 per day

      loan.status = 'overdue';
      loan.fineAmount = fine;
      loan.fineStatus = 'unpaid';
      await loan.save();
    }

    if (overdueLoans.length > 0) {
      console.log(`[CRON] Overdue job processed: Updated ${overdueLoans.length} loans.`);
    }
  } catch (error) {
    console.error(`[CRON] Error updating overdue loans: ${error.message}`);
  }
};

// Run automatically every night at 00:00 (Midnight)
const initCronJobs = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('[CRON] Running daily midnight overdue scanner...');
    runOverdueCheck();
  });
};

module.exports = { initCronJobs, runOverdueCheck };