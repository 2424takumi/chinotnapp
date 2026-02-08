'use client';

import { useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Worker } from '@/lib/types/database';
import { logger } from '@/lib/utils/logger';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ブラウザ環境でのみクライアントを作成
    if (typeof window === 'undefined') {
      logger.debug('[useAuth] サーバーサイドでは実行しない');
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // タイムアウト処理: 15秒経ってもローディングが完了しない場合は強制的に完了
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        logger.error('[useAuth] タイムアウト: ローディングを強制的に完了します');
        setLoading(false);
      }
    }, 15000);

    // 初期セッションチェック: 既存セッションがあれば即座に状態を更新
    const initAuth = async () => {
      try {
        logger.debug('[useAuth initAuth] 初期セッションチェック開始');
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('[useAuth initAuth] セッション取得エラー:', sessionError);
          if (mountedRef.current) {
            setLoading(false);
          }
          return;
        }

        if (!mountedRef.current) {
          logger.debug('[useAuth initAuth] アンマウント済み - 処理中断');
          return;
        }

        logger.debug('[useAuth initAuth] セッション取得完了:', session?.user?.email || 'null');
        setUser(session?.user ?? null);

        if (session?.user) {
          // ワーカー情報を取得
          logger.debug('[useAuth initAuth] ワーカー情報を取得中... auth_user_id:', session.user.id);

          try {
            const workerPromise = supabase
              .from('workers')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .eq('is_authenticated', true)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Worker query timeout')), 10000)
            );

            const { data: workerData, error: workerError } = (await Promise.race([
              workerPromise,
              timeoutPromise,
            ])) as any;

            if (!mountedRef.current) {
              logger.debug('[useAuth initAuth] ワーカー取得中にアンマウント');
              return;
            }

            if (workerError) {
              logger.error('[useAuth initAuth] ワーカー情報取得エラー:', workerError);
              setWorker(null);
            } else {
              logger.debug(
                '[useAuth initAuth] ワーカーをセット:',
                workerData ? `ID: ${workerData.worker_id}` : 'null'
              );
              setWorker(workerData);
            }
          } catch (workerQueryError) {
            logger.error('[useAuth initAuth] ワーカークエリエラー:', workerQueryError);
            if (mountedRef.current) {
              setWorker(null);
            }
          }
        }

        if (mountedRef.current) {
          logger.debug('[useAuth initAuth] 初期化完了 - ローディング終了');
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (error) {
        logger.error('[useAuth initAuth] 予期しないエラー:', error);
        if (mountedRef.current) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    // 認証状態の変更を監視（将来の変更用）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug(
        '[useAuth onAuthStateChange] イベント:',
        event,
        'セッション:',
        session?.user?.email,
        'mounted:',
        mountedRef.current
      );

      if (!mountedRef.current) {
        logger.debug(
          '[useAuth onAuthStateChange] mountedRef.currentがfalse - return（イベント開始時）'
        );
        return;
      }

      try {
        logger.debug(
          '[useAuth onAuthStateChange] ユーザー状態を更新:',
          session?.user?.email || 'null'
        );
        setUser(session?.user ?? null);

        if (session?.user) {
          // ワーカー情報を取得（10秒タイムアウト付き）
          logger.debug(
            '[useAuth onAuthStateChange] ワーカー情報を取得中... auth_user_id:',
            session.user.id
          );
          const workerStartTime = Date.now();

          try {
            const workerPromise = supabase
              .from('workers')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .eq('is_authenticated', true)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Worker query timeout')), 10000)
            );

            const { data: workerData, error: workerError } = (await Promise.race([
              workerPromise,
              timeoutPromise,
            ])) as any;

            const workerTime = Date.now() - workerStartTime;
            logger.debug(`[useAuth onAuthStateChange] ワーカー情報取得完了 (${workerTime}ms)`, {
              workerData,
              workerError,
              mounted: mountedRef.current,
            });

            if (!mountedRef.current) {
              logger.debug(
                '[useAuth onAuthStateChange] mountedRef.currentがfalse - stateを更新せずにreturn'
              );
              return;
            }

            if (workerError) {
              logger.error('[useAuth onAuthStateChange] ワーカー情報取得エラー:', workerError);
              setWorker(null);
            } else {
              logger.debug(
                '[useAuth onAuthStateChange] ワーカーをセット:',
                workerData ? `ID: ${workerData.worker_id}` : 'null'
              );
              setWorker(workerData);
            }
          } catch (workerQueryError) {
            logger.error(
              '[useAuth onAuthStateChange] ワーカークエリエラー（タイムアウトまたはその他）:',
              workerQueryError
            );
            setWorker(null);
          }
        } else {
          logger.debug('[useAuth onAuthStateChange] セッションなし - workerをnullに設定');
          setWorker(null);
        }

        logger.debug('[useAuth onAuthStateChange] ローディングを完了');
        setLoading(false);
        clearTimeout(timeoutId);
      } catch (error) {
        logger.error('[useAuth onAuthStateChange] エラー:', error);
        if (mountedRef.current) {
          setWorker(null);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    });

    // リスナー設定後に初期セッションチェックを実行
    // これにより、ログイン時の状態変更もリスナーで確実にキャッチできる
    initAuth();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    worker,
    loading,
    isAuthenticated: !!user,
  };
}
