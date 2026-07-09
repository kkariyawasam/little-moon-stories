import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '';
const localDirname = typeof (globalThis as any).__dirname !== 'undefined' ? (globalThis as any).__dirname : path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const isVercel = process.env.VERCEL === '1';
const checkoutEnabled = process.env.CHECKOUT_ENABLED === 'true';
const mockCheckoutEnabled = !isProd && process.env.ALLOW_MOCK_CHECKOUT === 'true';
const port = 3000;

// Initialize clients conditionally to prevent startup crashes if keys are missing
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// PayPal Configuration
const getPayPalApiUrl = () => {
  return process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
};

const getPayPalAccessToken = async (): Promise<string | null> => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const response = await fetch(`${getPayPalApiUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      console.error('Failed to get PayPal access token:', await response.text());
      return null;
    }
    
    const data: any = await response.json();
    return data.access_token;
  } catch (err) {
    console.error('PayPal OAuth request failed:', err);
    return null;
  }
};

const isValidEmail = (value: unknown): value is string => {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
};

const isValidDeliveryTime = (value: unknown): value is string => {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
};

const isValidTimezone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const cleanText = (value: unknown, fallback: string, maxLength = 250): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
};

const normalizeChildren = (children: unknown): ChildDetail[] => {
  if (!Array.isArray(children) || children.length === 0 || children.length > 5) {
    throw new Error('Please provide between 1 and 5 child profiles.');
  }

  return children.map((child, index) => {
    if (!child || typeof child !== 'object') {
      throw new Error(`Child #${index + 1} is invalid.`);
    }

    const record = child as Record<string, unknown>;
    const nickname = cleanText(record.nickname || record.name, '', 80);
    const gender = cleanText(record.gender, '', 20);
    const birthday = cleanText(record.birthday, '', 20);

    if (!nickname) throw new Error(`Child #${index + 1} nickname is required.`);
    if (!['female', 'male', 'other'].includes(gender)) throw new Error(`Child #${index + 1} gender is invalid.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new Error(`Child #${index + 1} birthday is invalid.`);

    const birthDate = new Date(`${birthday}T00:00:00Z`);
    const now = new Date();
    const earliest = new Date(Date.UTC(now.getUTCFullYear() - 20, now.getUTCMonth(), now.getUTCDate()));
    if (Number.isNaN(birthDate.getTime()) || birthDate > now || birthDate < earliest) {
      throw new Error(`Child #${index + 1} birthday is outside the allowed range.`);
    }

    return {
      name: nickname,
      nickname,
      gender,
      birthday
    };
  });
};

const enqueueSignupStoryJob = async (subscriberId: unknown) => {
  if (!supabase) return;

  const numericSubscriberId = Number(subscriberId);
  if (!Number.isInteger(numericSubscriberId)) return;

  const { data, error } = await supabase.rpc('enqueue_signup_story_job', {
    p_subscriber_id: numericSubscriberId
  });

  if (error) {
    console.error('Unable to enqueue same-day signup story job:', error);
    return;
  }

  if (data) {
    console.log(`Same-day signup story job created: ${data}`);
  } else {
    console.log(`No same-day signup story job needed for subscriber ${numericSubscriberId}.`);
  }
};

// Memory database fallback for easy previewing when keys are not set
interface ChildDetail {
  name: string;
  nickname: string;
  gender: string;
  birthday: string;
}

interface Subscriber {
  id: string;
  parent_email: string;
  child_names: string;
  age_range: '3-5' | '6-8';
  delivery_time: string;
  timezone: string;
  preferred_theme: string;
  favorite_hobby: string;
  favorite_animal: string;
  plan_type: 'monthly';
  payment_status: number; // 0 for unpaid, 1 for paid
  package_end_date: string | null;
  payment_provider_order_id?: string;
  created_at: string;
  children_list?: ChildDetail[];
}

const mockSubscribers: Subscriber[] = [
  {
    id: '1',
    parent_email: 'parent.demo@example.com',
    child_names: 'Mia',
    age_range: '3-5',
    delivery_time: '19:30',
    timezone: 'America/New_York',
    preferred_theme: 'Friendship & Nature',
    favorite_hobby: 'reading',
    favorite_animal: 'elephant',
    plan_type: 'monthly',
    payment_status: 1,
    package_end_date: new Date(Date.now() + 3600000 * 24 * 29).toISOString(),
    payment_provider_order_id: 'cs_mock_paid123',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: '2',
    parent_email: 'family.demo@example.com',
    child_names: 'Noah',
    age_range: '6-8',
    delivery_time: '20:15',
    timezone: 'America/Los_Angeles',
    preferred_theme: 'magic space adventures',
    favorite_hobby: 'drawing',
    favorite_animal: 'dolphin',
    plan_type: 'monthly',
    payment_status: 1,
    package_end_date: new Date(Date.now() + 3600000 * 24 * 28).toISOString(),
    payment_provider_order_id: 'cs_mock_paid456',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

app.disable('x-powered-by');

app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// JSON parsing for standard routes. Keep this small because signup payloads are tiny.
app.use(express.json({ limit: '25kb' }));

// API endpoints
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    checkoutEnabled,
  });
});

app.get('/api/subscribers', async (req: Request, res: Response) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || req.header('x-admin-api-key') !== adminKey) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*, children:children(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } else {
      res.json(mockSubscribers.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriber action endpoint (Signup + Payment handler)
app.post('/api/subscribe', async (req: Request, res: Response): Promise<void> => {
  if (!checkoutEnabled) {
    res.status(503).json({ error: 'Coming Soon. Checkout is not available yet.' });
    return;
  }

  const {
    parent_email,
    child_names,
    children_list,
    age_range,
    delivery_time,
    timezone,
    preferred_theme,
    favorite_hobby,
    favorite_animal
  } = req.body;

  if (!parent_email || !child_names) {
    res.status(400).json({ error: 'Parent email and child name are required.' });
    return;
  }

  let normalizedChildren: ChildDetail[];
  try {
    if (!isValidEmail(parent_email)) throw new Error('Please provide a valid parent email.');
    if (age_range && !['3-5', '6-8'].includes(age_range)) throw new Error('Age range is invalid.');
    if (!isValidDeliveryTime(delivery_time)) throw new Error('Delivery time must use HH:mm format.');
    if (!isValidTimezone(timezone)) throw new Error('Timezone is invalid.');
    normalizedChildren = normalizeChildren(children_list);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid signup details.' });
    return;
  }

  let tempSubId = `sub_temp_${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const newSub: Subscriber = {
    id: '', // Will be updated as soon as DB generates the SERIAL/IDENTITY id starting from 1
    parent_email: parent_email.trim().toLowerCase(),
    child_names: cleanText(child_names, normalizedChildren.map(c => c.nickname).join(' & '), 250),
    children_list: normalizedChildren,
    age_range: age_range || '3-5',
    delivery_time,
    timezone,
    preferred_theme: cleanText(preferred_theme, 'Adventure', 250),
    favorite_hobby: cleanText(favorite_hobby, 'reading', 250),
    favorite_animal: cleanText(favorite_animal, 'elephant', 250),
    plan_type: 'monthly',
    payment_status: 0,
    package_end_date: expiresAt,
    created_at: new Date().toISOString()
  };

  try {
    let finalSubscriberId: string = tempSubId;

    // 1. Save to database
    if (supabase) {
      // Note: We let Supabase/PostgreSQL generate the auto-incrementing integer key (starting from 1)
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{
          parent_email: newSub.parent_email,
          age_range: newSub.age_range,
          delivery_time: newSub.delivery_time,
          timezone: newSub.timezone,
          preferred_theme: newSub.preferred_theme,
          favorite_hobby: newSub.favorite_hobby,
          favorite_animal: newSub.favorite_animal,
          plan_type: newSub.plan_type,
          payment_status: newSub.payment_status,
          package_end_date: newSub.package_end_date,
          created_at: newSub.created_at
        }])
        .select('id');

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      if (data && data[0]) {
        finalSubscriberId = String(data[0].id);
        newSub.id = finalSubscriberId;
      } else {
        throw new Error('Supabase failed to return an auto-incrementing ID.');
      }

      // Also insert detailed child profiles into the separate children table!
      if (newSub.children_list && newSub.children_list.length > 0) {
        const childrenPayload = newSub.children_list.map((c: any) => ({
          subscriber_id: parseInt(finalSubscriberId, 10),
          nickname: c.name || c.nickname,
          gender: c.gender,
          birthday: c.birthday
        }));

        const { error: childError } = await supabase
          .from('children')
          .insert(childrenPayload);

        if (childError) {
          console.error('Supabase children insert error:', childError);
          await supabase.from('subscribers').delete().eq('id', finalSubscriberId);
          throw new Error('Unable to save child profiles.');
        }
      }
    } else {
      // Mock DB: auto-generate integer IDs starting from 1
      const nextId = mockSubscribers.length > 0
        ? Math.max(...mockSubscribers.map(s => {
            const numeric = parseInt(String(s.id).replace(/\D/g, ''), 10);
            return isNaN(numeric) ? 0 : numeric;
          })) + 1
        : 1;

      finalSubscriberId = String(nextId);
      newSub.id = finalSubscriberId;
      mockSubscribers.push(newSub);
    }

    // 2. PayPal Integration
    {
      const redirectBase = process.env.APP_URL || `http://localhost:${port}`;
      const accessToken = await getPayPalAccessToken();
      
      if (accessToken) {
        try {
          const resPayPal = await fetch(`${getPayPalApiUrl()}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  reference_id: finalSubscriberId,
                  description: 'Cozy Kid Tales - Premium Personalized Subscription (1 Month)',
                  amount: {
                    currency_code: 'USD',
                    value: '9.00'
                  }
                }
              ],
              application_context: {
                brand_name: 'Cozy Kid Tales',
                landing_page: 'BILLING',
                user_action: 'PAY_NOW',
                return_url: `${redirectBase}/api/paypal-checkout-success?sub_id=${finalSubscriberId}`,
                cancel_url: `${redirectBase}/?checkout_cancelled=true`
              }
            })
          });

          if (!resPayPal.ok) {
            const errBody = await resPayPal.text();
            console.error('PayPal Order creation failed API response:', errBody);
            throw new Error(`PayPal Order creation failed: ${errBody}`);
          }

          const payPalOrder: any = await resPayPal.json();
          const approveLink = payPalOrder.links?.find((l: any) => l.rel === 'approve')?.href;

          if (!approveLink) {
            throw new Error('No approval link returned from PayPal.');
          }

          // Save token/orderId locally or in DB
          if (supabase) {
            await supabase
              .from('subscribers')
              .update({ payment_provider_order_id: payPalOrder.id })
              .eq('id', finalSubscriberId);
          } else {
            newSub.payment_provider_order_id = payPalOrder.id;
          }

          res.json({
            checkoutSessionUrl: approveLink,
            subscriberId: finalSubscriberId,
            planType: 'monthly',
            isMock: false
          });
        } catch (payPayPalErr: any) {
          console.error('PayPal api failed or got rate-limited. Falling back to simulation.', payPayPalErr);
          if (!mockCheckoutEnabled) {
            res.status(502).json({ error: 'Unable to start checkout. Please try again later.' });
            return;
          }
          const mockRedirectUrl = `/api/mock-checkout-success?session_id=pay_mock_${finalSubscriberId}&sub_id=${finalSubscriberId}`;
          res.json({
            checkoutSessionUrl: mockRedirectUrl,
            subscriberId: finalSubscriberId,
            planType: 'monthly',
            isMock: true
          });
        }
      } else {
        if (!mockCheckoutEnabled) {
          res.status(503).json({ error: 'Checkout is not configured yet.' });
          return;
        }
        // Fallback: Create simulated mock PayPal checkout URL for local developer sandbox
        const mockRedirectUrl = `/api/mock-checkout-success?session_id=pay_mock_${finalSubscriberId}&sub_id=${finalSubscriberId}`;
        res.json({
          checkoutSessionUrl: mockRedirectUrl,
          subscriberId: finalSubscriberId,
          planType: 'monthly',
          isMock: true
        });
      }
    }
  } catch (err: any) {
    console.error('Subscription creation failed:', err);
    res.status(500).json({ error: 'Unable to create your story plan right now. Please try again later.' });
  }
});

// Callback route to capture PayPal checkout order and finalize subscription
app.get('/api/paypal-checkout-success', async (req: Request, res: Response): Promise<void> => {
  if (!checkoutEnabled) {
    res.redirect(`/?checkout_cancelled=true`);
    return;
  }

  const { token, sub_id } = req.query; // token is PayPal's checkout order ID when returning
  const port = 3000;
  const redirectBase = process.env.APP_URL || `http://localhost:${port}`;

  if (!token || !sub_id) {
    res.redirect(`/?checkout_cancelled=true`);
    return;
  }

  const paidExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      console.error('PayPal capture blocked because PayPal credentials are not configured.');
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    // Capture PayPal order
    const captureRes = await fetch(`${getPayPalApiUrl()}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!captureRes.ok) {
      console.error('PayPal Order capture failed:', await captureRes.text());
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    const captureData: any = await captureRes.json();
    const referenceId = captureData.purchase_units?.[0]?.reference_id;
    if (String(referenceId) !== String(sub_id)) {
      console.error('PayPal capture reference mismatch:', { referenceId, sub_id });
      res.redirect(`/?checkout_cancelled=true`);
      return;
    }

    console.log(`PayPal capture successful for order ${token}`);

    // Now update database subscriber payment_status
    if (supabase) {
      const { error } = await supabase
        .from('subscribers')
        .update({ 
          payment_status: 1, 
          payment_provider_order_id: token as string,
          package_end_date: paidExpiryDate,
          plan_type: 'monthly'
        })
        .eq('id', sub_id);
      if (error) console.error('Supabase update error:', error);
      if (!error) await enqueueSignupStoryJob(sub_id);
    }

    const sub = mockSubscribers.find(s => s.id === sub_id);
    if (sub) {
      sub.payment_status = 1;
      sub.payment_provider_order_id = token as string;
      sub.package_end_date = paidExpiryDate;
      sub.plan_type = 'monthly';
    }

    res.redirect(`/?checkout_success=true&sub_id=${sub_id}`);
  } catch (err) {
    console.error('PayPal capture callback error:', err);
    res.redirect(`/?checkout_cancelled=true`);
  }
});

// Helper route to simulate successful checkout redirection & mock webhook effect
app.get('/api/mock-checkout-success', async (req: Request, res: Response): Promise<void> => {
  if (!mockCheckoutEnabled) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { session_id, sub_id } = req.query;

  const paidExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Let's mark the payment_status of this mockup subscriber as 1!
  if (sub_id) {
    if (supabase) {
      const { error } = await supabase
        .from('subscribers')
        .update({ 
          payment_status: 1, 
          payment_provider_order_id: session_id as string,
          package_end_date: paidExpiryDate,
          plan_type: 'monthly'
        })
        .eq('id', sub_id);
      if (error) console.error('Supabase mock update error:', error);
      if (!error) await enqueueSignupStoryJob(sub_id);
    }

    const sub = mockSubscribers.find(s => s.id === sub_id);
    if (sub) {
      sub.payment_status = 1;
      sub.payment_provider_order_id = session_id as string;
      sub.package_end_date = paidExpiryDate;
      sub.plan_type = 'monthly';
    }
  }

  res.redirect(`/?checkout_success=true&sub_id=${sub_id || ''}`);
});

export default app;

// Serve frontend build static files in production or hook up Vite middleware in development
async function startServer() {
  if (!isProd) {
    console.log('Configuring Vite Development Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(localDirname, 'dist');
    console.log(`Production environment detected. Serving static assets from ${distPath}`);
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Start Server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Cozy Kid Tales fullstack server running at http://localhost:${port}`);
  });
}

if (!isVercel) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
