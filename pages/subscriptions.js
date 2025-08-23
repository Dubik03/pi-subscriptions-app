useEffect(() => {
  const fetchSubscriptions = async () => {
    console.log("fetchSubscriptions started");

    const waitForPi = async () => {
      if (!window.Pi || !window.Pi.initialized) {
        console.log("⚠️ Pi SDK not ready yet, retrying in 500ms...");
        setTimeout(waitForPi, 500);
        return;
      }

      try {
        const isAuth = await window.Pi.Wallet.checkAuthenticated();
        console.log("✅ Pi wallet authenticated:", isAuth);

        if (!isAuth) {
          console.log("ℹ️ User not authenticated. Please open in Pi Browser to login.");
          setLoading(false);
          return; // fetch neděláme, dokud není autentizován
        }

        const piUid = window.Pi.Wallet.user?.uid;
        console.log("ℹ️ Current user Pi UID:", piUid);

        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, plan_name, pi_amount, end_date, status')
          .eq('user_id', piUid);

        if (error) console.error("❌ Supabase fetch error:", error);
        else {
          console.log("✅ Subscriptions fetched:", data);
          setSubscriptions(data || []);
        }
      } catch (err) {
        console.error("🔥 Pi fetchSubscriptions error:", err);
        setSubscriptions([]);
      }

      setLoading(false);
    };

    waitForPi();
  };

  fetchSubscriptions();
}, []);
