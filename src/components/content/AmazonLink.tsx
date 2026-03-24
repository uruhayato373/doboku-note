export default function AmazonLink({
  asin,
  title,
  buttonText = '商品を見る',
}: {
  asin: string;
  title: string;
  buttonText?: string;
}) {
  const associateId = 'uruhayato373-22';
  const url = `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${associateId}`;

  return (
    <div className="my-4 p-4 border rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={`https://images-fe.ssl-images-amazon.com/images/P/${asin}.09.MZZZZZZZ`}
            alt={title}
            className="w-32 h-32 object-contain"
          />
        </div>
        <div className="flex-grow">
          <h4 className="text-lg font-semibold mb-2">{title}</h4>
          <a
            href={url}
            className="inline-block bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors no-underline"
            target="_blank"
            rel="nofollow noopener"
          >
            {buttonText}
          </a>
        </div>
      </div>
    </div>
  );
}
