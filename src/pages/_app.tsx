import type { AppProps } from "next/app";
import Head from "next/head";
import { Layout } from "../components/Layout";
import type { PageData } from "../lib/types";
import "../../public/css/styles.css";
import "../../public/css/content.css";
import "../../public/css/polish.css";

export default function App({ Component, pageProps }: AppProps<PageData>) {
  return (
    <>
      <Head>
        <title>
          {pageProps.title || "Nanny Events & Caterers"} | Nanny Events &amp;
          Caterers
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Nanny Events and Caterers provides outside catering, corporate catering, weddings, ruracio ceremonies, private functions and traditional Kenyan cuisine. Quality, quantity and customer satisfaction."
        />
      </Head>
      <Layout
        currentUser={pageProps.currentUser || null}
        flash={pageProps.flash || null}
        year={pageProps.year || new Date().getFullYear()}
      >
        <Component {...pageProps} />
      </Layout>
    </>
  );
}
